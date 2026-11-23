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

async function signedInAdmin() {
  const credentials = { email: "admin@example.com", name: "Admin", password: "senha-super-segura-123" };
  const user = await UserService.create({ ...credentials, role: "ADMIN" });
  const agent = request.agent(app);
  expect((await agent.post("/api/v1/auth/login").set("Origin", ORIGIN).send(credentials)).status).toBe(200);
  return { agent, user };
}

const waiting = (email = "ana@example.com") => UserService.create({ email, name: "Ana", password: "senha-super-segura-123", approved: false });

describe("admin: users", () => {
  it("lists real accounts with the ones waiting for approval first, without secrets", async () => {
    const { agent } = await signedInAdmin();
    await createLoggedInUser({ email: "bia@example.com" });
    await waiting();
    const res = await agent.get("/api/v1/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ email: "ana@example.com", approvedAt: null });
    expect(res.body.data.map((u) => u.email).sort()).toEqual(["admin@example.com", "ana@example.com", "bia@example.com"]);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|twoFactorSecret/);
  });

  it("approves a waiting account, which can then sign in and gets an e-mail", async () => {
    const { agent } = await signedInAdmin();
    const ana = await waiting();
    const login = () => request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email: ana.email, password: "senha-super-segura-123" });
    expect((await login()).body.code).toBe("ACCOUNT_PENDING");

    expect((await agent.post(`/api/v1/admin/users/${ana.id}/approve`).set("Origin", ORIGIN).send()).status).toBe(204);
    expect(MailService.outbox.some((m) => m.to === ana.email && /liberada/.test(m.subject))).toBe(true);
    expect((await login()).status).toBe(200);
    // Twice: already approved.
    expect((await agent.post(`/api/v1/admin/users/${ana.id}/approve`).set("Origin", ORIGIN).send()).status).toBe(409);
  });

  it("deletes another account with everything in it, never itself or another admin", async () => {
    const { agent, user: admin } = await signedInAdmin();
    const ana = await waiting();
    const other = await UserService.create({ email: "chefe@example.com", name: "Chefe", password: "senha-super-segura-123", role: "ADMIN" });

    expect((await agent.delete(`/api/v1/admin/users/${ana.id}`).set("Origin", ORIGIN).send()).status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: ana.id } })).toBeNull();
    expect(await prisma.userSettings.count({ where: { userId: ana.id } })).toBe(0);

    expect((await agent.delete(`/api/v1/admin/users/${admin.id}`).set("Origin", ORIGIN).send()).status).toBe(409);
    expect((await agent.delete(`/api/v1/admin/users/${other.id}`).set("Origin", ORIGIN).send()).status).toBe(409);
  });

  it("is hidden from regular users", async () => {
    const { agent } = await createLoggedInUser();
    const ana = await waiting();
    const statuses = [
      (await agent.get("/api/v1/admin/users")).status,
      (await agent.post(`/api/v1/admin/users/${ana.id}/approve`).set("Origin", ORIGIN).send()).status,
      (await agent.delete(`/api/v1/admin/users/${ana.id}`).set("Origin", ORIGIN).send()).status,
    ];
    expect(statuses).toEqual([404, 404, 404]);
    expect((await prisma.user.findUnique({ where: { id: ana.id } })).approvedAt).toBeNull();
  });
});
