import { hash } from "@node-rs/argon2";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import MailService from "../../src/services/mail/MailService.js";
import UserService from "../../src/services/UserService.js";
import { ORIGIN, app, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(async () => {
  await resetDatabase();
  MailService.outbox.length = 0;
});
afterAll(() => prisma.$disconnect());

const person = { name: "Ana", email: "ana@example.com", password: "senha-super-segura-123" };

const post = (path, body) => request(app).post(`/api/v1${path}`).set("Origin", ORIGIN).send(body);
const login = (email, password) => post("/auth/login", { email, password });

/** Token from the last e-mail sent to `to` (links carry it after "#token="). */
function tokenFromMail(to) {
  const mail = MailService.outbox.findLast((m) => m.to === to);
  return mail?.text.match(/#token=([A-Za-z0-9_-]{43})/)?.[1];
}

describe("sign-up", () => {
  it("creates the account, e-mails a link and only lets in after the confirmation and an admin's approval", async () => {
    const admin = await UserService.create({ email: "admin@example.com", name: "Admin", password: "senha-super-segura-123", role: "ADMIN" });
    const res = await post("/auth/register", person);
    expect(res.status).toBe(202);
    expect(MailService.outbox).toHaveLength(1);
    expect(MailService.outbox[0].subject).toMatch(/Confirme seu e-mail/);

    const before = await login(person.email, person.password);
    expect(before.status).toBe(403);
    expect(before.body.code).toBe("EMAIL_NOT_VERIFIED");

    const token = tokenFromMail(person.email);
    const verified = await post("/auth/verify-email", { token });
    expect(verified.status).toBe(200);
    expect(verified.body.data).toEqual({ pendingApproval: true });
    // A link works once.
    expect((await post("/auth/verify-email", { token })).status).toBe(400);
    // The admin is told someone is waiting.
    expect(MailService.outbox.some((m) => m.to === admin.email && /quer entrar no nuCorre/.test(m.subject))).toBe(true);

    const waiting = await login(person.email, person.password);
    expect(waiting.status).toBe(403);
    expect(waiting.body.code).toBe("ACCOUNT_PENDING");

    const user = await prisma.user.findUnique({ where: { email: person.email } });
    await prisma.user.update({ where: { id: user.id }, data: { approvedAt: new Date() } });
    const after = await login(person.email, person.password);
    expect(after.status).toBe(200);
    // Settings come with the account, like user:create.
    expect(await prisma.userSettings.count({ where: { user: { email: person.email } } })).toBe(1);
  });

  it("answers the same for an e-mail that already has an account, and warns its owner", async () => {
    await UserService.create(person);
    const res = await post("/auth/register", { ...person, name: "Outra pessoa", password: "outra-senha-forte-1" });
    expect(res.status).toBe(202);
    expect(await prisma.user.count()).toBe(1);
    expect(MailService.outbox[0].subject).toMatch(/já tem uma conta/);
    expect(tokenFromMail(person.email)).toBeUndefined();
  });

  it("validates the fields and stores only a peppered Argon2id hash", async () => {
    const bad = await post("/auth/register", { name: "", email: "x", password: "curta" });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.fields).sort()).toEqual(["email", "name", "password"]);

    await post("/auth/register", person);
    const user = await prisma.user.findUnique({ where: { email: person.email } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(person.password);
  });

  it("resends the confirmation link, replacing the old one", async () => {
    await post("/auth/register", person);
    const first = tokenFromMail(person.email);
    expect((await post("/auth/resend-verification", { email: person.email })).status).toBe(204);
    const second = tokenFromMail(person.email);
    expect(second).not.toBe(first);
    expect((await post("/auth/verify-email", { token: first })).status).toBe(400);
    expect((await post("/auth/verify-email", { token: second })).status).toBe(200);
    // Unknown address: same answer, nothing sent.
    const count = MailService.outbox.length;
    expect((await post("/auth/resend-verification", { email: "ninguem@example.com" })).status).toBe(204);
    expect(MailService.outbox).toHaveLength(count);
  });

  it("tells the login screen whether sign-up is open", async () => {
    const res = await request(app).get("/api/v1/auth/options");
    expect(res.body.data).toEqual({ signupEnabled: true, demoEnabled: true });
  });
});

describe("forgot password", () => {
  it("e-mails a reset link; the new password works, the old one and every session stop working", async () => {
    const { agent, credentials } = await createLoggedInUser();
    expect((await post("/auth/forgot-password", { email: credentials.email })).status).toBe(204);
    const token = tokenFromMail(credentials.email);
    expect(token).toBeDefined();

    const reset = await post("/auth/reset-password", { token, password: "nova-senha-bem-forte" });
    expect(reset.status).toBe(204);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
    expect((await login(credentials.email, credentials.password)).status).toBe(401);
    expect((await login(credentials.email, "nova-senha-bem-forte")).status).toBe(200);
    expect(MailService.outbox.at(-1).subject).toMatch(/senha do nuCorre foi alterada/);
    // Used once.
    expect((await post("/auth/reset-password", { token, password: "mais-uma-senha-forte" })).status).toBe(400);
  });

  it("answers the same for unknown e-mails and sends nothing", async () => {
    const res = await post("/auth/forgot-password", { email: "ninguem@example.com" });
    expect(res.status).toBe(204);
    expect(MailService.outbox).toHaveLength(0);
  });

  it("refuses expired links", async () => {
    const { credentials } = await createLoggedInUser();
    await post("/auth/forgot-password", { email: credentials.email });
    const token = tokenFromMail(credentials.email);
    await prisma.authToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await post("/auth/reset-password", { token, password: "nova-senha-bem-forte" })).status).toBe(400);
  });

  it("limits how many links one address can ask for", async () => {
    const { credentials } = await createLoggedInUser();
    for (let i = 0; i < 3; i++) await post("/auth/forgot-password", { email: credentials.email });
    const res = await post("/auth/forgot-password", { email: credentials.email });
    expect(res.status).toBe(429);
  });

  it("stores link tokens only as HMAC", async () => {
    const { credentials } = await createLoggedInUser();
    await post("/auth/forgot-password", { email: credentials.email });
    const token = tokenFromMail(credentials.email);
    const [row] = await prisma.authToken.findMany();
    expect(row.id).not.toBe(token);
    expect(row.id).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("change e-mail", () => {
  it("needs the password, confirms through the new address and warns the old one", async () => {
    const { agent, credentials } = await createLoggedInUser();
    const wrong = await agent.put("/api/v1/me/email").set("Origin", ORIGIN).send({ newEmail: "novo@example.com", currentPassword: "nao-e-essa" });
    expect(wrong.status).toBe(422);

    const ok = await agent.put("/api/v1/me/email").set("Origin", ORIGIN).send({ newEmail: "Novo@Example.com", currentPassword: credentials.password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.pendingEmail).toBe("novo@example.com");
    expect(MailService.outbox.some((m) => m.to === credentials.email && /trocar o e-mail/.test(m.subject))).toBe(true);

    // Nothing changes until the link is opened.
    expect((await agent.get("/api/v1/auth/me")).body.data.user.email).toBe(credentials.email);
    expect((await post("/auth/confirm-email-change", { token: tokenFromMail("novo@example.com") })).status).toBe(204);
    expect((await agent.get("/api/v1/auth/me")).body.data.user.email).toBe("novo@example.com");
    expect((await login("novo@example.com", credentials.password)).status).toBe(200);
  });

  it("does not reveal that the new address belongs to someone else", async () => {
    const { agent, credentials } = await createLoggedInUser();
    const other = await createLoggedInUser();
    const res = await agent.put("/api/v1/me/email").set("Origin", ORIGIN).send({ newEmail: other.credentials.email, currentPassword: credentials.password });
    expect(res.status).toBe(200);
    expect(tokenFromMail(other.credentials.email)).toBeUndefined();
    expect(await prisma.authToken.count()).toBe(0);
  });
});

describe("password pepper", () => {
  it("accepts a password saved before AUTH_SECRET existed once, and stores it again with the pepper", async () => {
    await UserService.create(person);
    const legacy = await hash(person.password, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
    await prisma.user.update({ where: { email: person.email }, data: { passwordHash: legacy } });

    expect((await login(person.email, person.password)).status).toBe(200);
    const after = (await prisma.user.findUnique({ where: { email: person.email } })).passwordHash;
    expect(after).not.toBe(legacy);
    expect((await login(person.email, person.password)).status).toBe(200);
    expect((await login(person.email, "senha-errada-123")).status).toBe(401);
  });
});
