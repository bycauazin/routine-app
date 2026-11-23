import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { apiRateLimitSettings } from "../../src/middlewares/rateLimit.js";
import MailService from "../../src/services/mail/MailService.js";
import { seal, unseal } from "../../src/services/security/secrets.js";
import TotpService, { hotp } from "../../src/services/security/TotpService.js";
import { ORIGIN, app, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(async () => {
  await resetDatabase();
  MailService.outbox.length = 0;
});
afterAll(() => prisma.$disconnect());

/** A second device signing in with the same credentials. */
async function signInAgain(credentials) {
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/login").set("Origin", ORIGIN).send(credentials);
  expect(res.status).toBe(200);
  return agent;
}

/** Code the authenticator app would show `offset` steps from now. */
async function appCode(userId, offset = 0) {
  const { twoFactorSecret } = await prisma.user.findUnique({ where: { id: userId } });
  return hotp(unseal(twoFactorSecret), TotpService.stepAt() + offset);
}

/** Code for the step right after the last accepted one (always fresh, always inside the window). */
async function nextCode(userId, delta = 1) {
  const { twoFactorSecret, twoFactorLastStep } = await prisma.user.findUnique({ where: { id: userId } });
  return hotp(unseal(twoFactorSecret), twoFactorLastStep + delta);
}

/** Turns 2FA on for a logged-in agent; returns the recovery codes. */
async function enableTwoFactor({ agent, user, credentials }) {
  const setup = await agent.post("/api/v1/me/two-factor/setup").set("Origin", ORIGIN).send({ currentPassword: credentials.password });
  expect(setup.status).toBe(200);
  const res = await agent.post("/api/v1/me/two-factor/enable").set("Origin", ORIGIN).send({ code: await appCode(user.id) });
  expect(res.status).toBe(200);
  return res.body.data.recoveryCodes;
}

describe("signed-in devices", () => {
  it("lists the sessions, ends one device or every other one", async () => {
    const owner = await createLoggedInUser();
    const phone = await signInAgain(owner.credentials);
    const tablet = await signInAgain(owner.credentials);

    const list = await owner.agent.get("/api/v1/me/sessions");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(3);
    expect(list.body.data.filter((s) => s.current)).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty("ipAddress");

    const phoneSession = (await phone.get("/api/v1/me/sessions")).body.data.find((s) => s.current);
    expect((await owner.agent.delete(`/api/v1/me/sessions/${phoneSession.id}`).set("Origin", ORIGIN)).status).toBe(204);
    expect((await phone.get("/api/v1/auth/me")).status).toBe(401);
    expect((await tablet.get("/api/v1/auth/me")).status).toBe(200);

    const others = await owner.agent.delete("/api/v1/me/sessions").set("Origin", ORIGIN);
    expect(others.body.data.signedOut).toBe(1);
    expect((await tablet.get("/api/v1/auth/me")).status).toBe(401);
    expect((await owner.agent.get("/api/v1/auth/me")).status).toBe(200);
  });

  it("cannot end another person's session", async () => {
    const ana = await createLoggedInUser();
    const bia = await createLoggedInUser();
    const biaSession = (await bia.agent.get("/api/v1/me/sessions")).body.data[0];
    expect((await ana.agent.delete(`/api/v1/me/sessions/${biaSession.id}`).set("Origin", ORIGIN)).status).toBe(404);
    expect((await ana.agent.delete("/api/v1/me/sessions/not-a-session").set("Origin", ORIGIN)).status).toBe(404);
    expect((await bia.agent.get("/api/v1/auth/me")).status).toBe(200);
  });

  it("ends a session 90 days after sign-in even if it is used every day", async () => {
    const { agent, user } = await createLoggedInUser();
    const longAgo = new Date(Date.now() - 91 * 86_400_000);
    await prisma.session.updateMany({ where: { userId: user.id }, data: { createdAt: longAgo, lastSeenAt: new Date() } });
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("never extends a session past the 90-day limit", async () => {
    const { agent, user } = await createLoggedInUser();
    const createdAt = new Date(Date.now() - 80 * 86_400_000);
    // Close to expiring, so it would normally be extended by 30 days.
    await prisma.session.updateMany({ where: { userId: user.id }, data: { createdAt, expiresAt: new Date(Date.now() + 86_400_000) } });
    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
    const session = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(session.expiresAt.getTime()).toBeLessThanOrEqual(createdAt.getTime() + 90 * 86_400_000);
  });
});

describe("API-wide rate limit", () => {
  afterEach(async () => {
    apiRateLimitSettings.enabled = false;
    apiRateLimitSettings.perMinute = 120;
    await prisma.requestCounter.deleteMany();
  });

  it("answers 429 with Retry-After once the client passes the limit for the minute", async () => {
    const { agent } = await createLoggedInUser();
    apiRateLimitSettings.enabled = true;
    apiRateLimitSettings.perMinute = 3;
    for (let i = 0; i < 3; i++) expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
    const blocked = await agent.get("/api/v1/auth/me");
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    // The health check stays outside the limit.
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});

describe("two-step verification", () => {
  it("is set up with the password and a first code, and gives 10 recovery codes once", async () => {
    const owner = await createLoggedInUser();
    const other = await signInAgain(owner.credentials);

    const wrongPassword = await owner.agent.post("/api/v1/me/two-factor/setup").set("Origin", ORIGIN).send({ currentPassword: "senha-errada-123" });
    expect(wrongPassword.status).toBe(422);

    const setup = await owner.agent.post("/api/v1/me/two-factor/setup").set("Origin", ORIGIN).send({ currentPassword: owner.credentials.password });
    expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.body.data.manualKey).toMatch(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/);
    // Stored encrypted, never as the base32 key shown to the user.
    const stored = await prisma.user.findUnique({ where: { id: owner.user.id } });
    expect(stored.twoFactorSecret).toMatch(/^v1\./);
    expect(stored.twoFactorSecret).not.toContain(setup.body.data.manualKey.replace(/ /g, ""));
    expect(stored.twoFactorEnabledAt).toBeNull();

    const wrong = await owner.agent.post("/api/v1/me/two-factor/enable").set("Origin", ORIGIN).send({ code: "000000" });
    expect(wrong.status).toBe(422);

    const res = await owner.agent.post("/api/v1/me/two-factor/enable").set("Origin", ORIGIN).send({ code: await appCode(owner.user.id) });
    expect(res.status).toBe(200);
    expect(res.body.data.recoveryCodes).toHaveLength(10);
    expect(await prisma.recoveryCode.count({ where: { userId: owner.user.id } })).toBe(10);
    // Only HMACs are stored.
    const ids = (await prisma.recoveryCode.findMany()).map((r) => r.id);
    expect(ids.some((id) => res.body.data.recoveryCodes.includes(id))).toBe(false);

    expect((await owner.agent.get("/api/v1/auth/me")).body.data.user.twoFactorEnabled).toBe(true);
    expect((await other.get("/api/v1/auth/me")).status).toBe(401); // other devices signed out
    expect(MailService.outbox.at(-1).subject).toMatch(/duas etapas ativada/);
    expect((await owner.agent.get("/api/v1/me/two-factor")).body.data).toEqual({ enabled: true, recoveryCodesLeft: 10 });
  });

  it("asks for the code after the password; a code works once and the ticket survives a typo", async () => {
    const owner = await createLoggedInUser();
    await enableTwoFactor(owner);

    const first = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(owner.credentials);
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ twoFactorRequired: true, ticket: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
    expect(first.headers["set-cookie"]).toBeUndefined();

    const agent = request.agent(app);
    const typo = await agent.post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code: "123456" });
    expect(typo.status).toBe(422);

    // The step used to turn 2FA on is spent: its code is refused.
    const reused = await agent.post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code: await nextCode(owner.user.id, 0) });
    expect(reused.status).toBe(422);

    const code = await nextCode(owner.user.id);
    const ok = await agent.post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.email).toBe(owner.credentials.email);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);

    // The ticket is used up.
    const again = await request(app).post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code });
    expect(again.status).toBe(401);
    expect(again.body.code).toBe("TWO_FACTOR_EXPIRED");
  });

  it("accepts each recovery code once and warns by e-mail", async () => {
    const owner = await createLoggedInUser();
    const [recovery] = await enableTwoFactor(owner);
    const signIn = async (code) => {
      const first = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(owner.credentials);
      return request(app).post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code });
    };
    expect((await signIn(recovery.toUpperCase())).status).toBe(200);
    expect(MailService.outbox.at(-1).subject).toMatch(/código de recuperação foi usado/);
    expect(MailService.outbox.at(-1).text).toMatch(/Restam 9/);
    expect((await signIn(recovery)).status).toBe(422);
  });

  it("locks after 5 wrong codes", async () => {
    const owner = await createLoggedInUser();
    await enableTwoFactor(owner);
    const first = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(owner.credentials);
    const attempt = (code) => request(app).post("/api/v1/auth/login/two-factor").set("Origin", ORIGIN).send({ ticket: first.body.data.ticket, code });
    for (let i = 0; i < 5; i++) expect((await attempt("000000")).status).toBe(422);
    expect((await attempt(await nextCode(owner.user.id))).status).toBe(429);
  });

  it("turns off only with the password and a code, and new recovery codes replace the old ones", async () => {
    const owner = await createLoggedInUser();
    const [oldRecovery] = await enableTwoFactor(owner);
    const post = (path, body) => owner.agent.post(`/api/v1${path}`).set("Origin", ORIGIN).send(body);

    const fresh = await post("/me/two-factor/recovery-codes", { currentPassword: owner.credentials.password, code: await nextCode(owner.user.id) });
    expect(fresh.status).toBe(200);
    expect(fresh.body.data.recoveryCodes).toHaveLength(10);
    expect((await post("/me/two-factor/disable", { currentPassword: owner.credentials.password, code: oldRecovery })).status).toBe(422);

    expect((await post("/me/two-factor/disable", { currentPassword: "senha-errada-123", code: fresh.body.data.recoveryCodes[0] })).status).toBe(422);
    expect((await post("/me/two-factor/disable", { currentPassword: owner.credentials.password, code: fresh.body.data.recoveryCodes[0] })).status).toBe(204);

    const user = await prisma.user.findUnique({ where: { id: owner.user.id } });
    expect(user.twoFactorEnabledAt).toBeNull();
    expect(user.twoFactorSecret).toBeNull();
    expect(await prisma.recoveryCode.count()).toBe(0);
    expect(MailService.outbox.at(-1).subject).toMatch(/duas etapas desativada/);
    const login = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(owner.credentials);
    expect(login.body.data.user).toBeDefined();
  });

  it("stores the key with authenticated encryption", () => {
    const secret = Buffer.from("segredo do app autenticador");
    const sealed = seal(secret);
    expect(seal(secret)).not.toBe(sealed); // fresh IV every time
    expect(unseal(sealed).equals(secret)).toBe(true);
    const parts = sealed.split(".");
    const flipped = Buffer.from(parts[3], "base64url");
    flipped[0] ^= 1;
    parts[3] = flipped.toString("base64url");
    expect(() => unseal(parts.join("."))).toThrow();
  });
});

describe("your data", () => {
  it("downloads everything stored for the user, without secrets or other people's data", async () => {
    const owner = await createLoggedInUser({ name: "Minha conta" });
    const other = await createLoggedInUser({ name: "Conta da outra pessoa" });

    const res = await owner.agent.get("/api/v1/me/export");
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.user.email).toBe(owner.credentials.email);
    expect(data.user.name).toBe("Minha conta");
    expect(data.settings.timezone).toBe("America/Sao_Paulo");
    const text = JSON.stringify(data);
    for (const secret of ["passwordHash", "twoFactorSecret", "Conta da outra pessoa", other.credentials.email]) expect(text).not.toContain(secret);
  });

  it("deletes the account and all its data only with the password (and the code when 2FA is on)", async () => {
    const owner = await createLoggedInUser();
    const other = await createLoggedInUser();
    await enableTwoFactor(owner);
    const del = (body) => owner.agent.delete("/api/v1/me").set("Origin", ORIGIN).send(body);

    expect((await del({ currentPassword: "senha-errada-123" })).status).toBe(422);
    const noCode = await del({ currentPassword: owner.credentials.password });
    expect(noCode.status).toBe(422);
    expect(noCode.body.fields.code).toBeDefined();

    const res = await del({ currentPassword: owner.credentials.password, code: await nextCode(owner.user.id) });
    expect(res.status).toBe(204);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/routine_session=;/);
    expect(await prisma.user.findUnique({ where: { id: owner.user.id } })).toBeNull();
    for (const table of ["userSettings", "session", "recoveryCode", "auditLog"]) {
      expect(await prisma[table].count({ where: { userId: owner.user.id } })).toBe(0);
    }
    expect(MailService.outbox.at(-1)).toMatchObject({ to: owner.credentials.email, subject: expect.stringMatching(/foi excluída/) });
    // Nobody else is touched.
    expect((await other.agent.get("/api/v1/auth/me")).status).toBe(200);
    expect(await prisma.userSettings.count({ where: { userId: other.user.id } })).toBe(1);
  });
});
