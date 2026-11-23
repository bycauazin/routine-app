import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { SESSION_COOKIE } from "../../src/config/session.js";
import SessionService from "../../src/services/security/SessionService.js";
import UserService from "../../src/services/UserService.js";
import { ORIGIN, app, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const credentials = { email: "dono@example.com", name: "Dono", password: "senha-super-segura-123" };

function sessionCookie(res) {
  return res.headers["set-cookie"]?.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

describe("login", () => {
  it("issues an HttpOnly, SameSite=Lax session cookie and stores only the token hash", async () => {
    await UserService.create(credentials);
    const res = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: "dono@example.com", name: "Dono" });
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const token = decodeURIComponent(cookie.split(";")[0].split("=")[1]);
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(SessionService.hashToken(token));
    expect(sessions[0].id).not.toBe(token);
  });

  it("normalizes e-mail case", async () => {
    await UserService.create(credentials);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", ORIGIN)
      .send({ ...credentials, email: "  DONO@Example.com " });
    expect(res.status).toBe(200);
  });

  it("returns the same generic error for unknown e-mail and wrong password", async () => {
    await UserService.create(credentials);
    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", ORIGIN)
      .send({ ...credentials, password: "errada-errada" });
    const unknownEmail = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", ORIGIN)
      .send({ ...credentials, email: "ninguem@example.com" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toEqual(unknownEmail.body.message);
  });

  it("rate-limits repeated failures for the same e-mail", async () => {
    await UserService.create(credentials);
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", ORIGIN)
        .send({ ...credentials, password: "errada-errada" });
    }
    // Even the correct password is refused while limited.
    const res = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send(credentials);
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });
});

describe("session", () => {
  it("protects private routes", async () => {
    const res = await request(app).get("/api/v1/me/export");
    expect(res.status).toBe(401);
  });

  it("tells the month the user started using the app (reports start there)", async () => {
    const { agent } = await createLoggedInUser();
    const me = (await agent.get("/api/v1/auth/me")).body.data;
    const user = me.user ?? me;
    expect(user.startMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it("logout revokes the session server-side", async () => {
    const { agent } = await createLoggedInUser();
    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);

    const logout = await agent.post("/api/v1/auth/logout").set("Origin", ORIGIN);
    expect(logout.status).toBe(204);
    expect(await prisma.session.count()).toBe(0);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
  });

  it("rejects forged or malformed session cookies", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${SESSION_COOKIE}=${"a".repeat(43)}`);
    expect(res.status).toBe(401);
  });
});

describe("CSRF protection", () => {
  it("rejects mutating requests without the app origin", async () => {
    const { agent } = await createLoggedInUser();
    const noOrigin = await agent.post("/api/v1/auth/logout");
    const evil = await agent.post("/api/v1/auth/logout").set("Origin", "https://evil.example");
    expect(noOrigin.status).toBe(403);
    expect(evil.status).toBe(403);
  });

  it("rejects form-encoded bodies", async () => {
    const { agent } = await createLoggedInUser();
    const res = await agent
      .post("/api/v1/auth/logout")
      .set("Origin", ORIGIN)
      .type("form")
      .send("name=x");
    expect(res.status).toBe(415);
  });
});

describe("password change", () => {
  it("requires the current password and signs out other devices", async () => {
    const { agent, credentials: creds } = await createLoggedInUser();
    const otherDevice = request.agent(app);
    await otherDevice.post("/api/v1/auth/login").set("Origin", ORIGIN).send(creds);

    const wrong = await agent
      .put("/api/v1/me/password")
      .set("Origin", ORIGIN)
      .send({ currentPassword: "nao-e-essa-senha", newPassword: "uma-senha-nova-forte" });
    expect(wrong.status).toBe(422);

    const ok = await agent
      .put("/api/v1/me/password")
      .set("Origin", ORIGIN)
      .send({ currentPassword: creds.password, newPassword: "uma-senha-nova-forte" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.otherSessionsSignedOut).toBe(1);

    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
    expect((await otherDevice.get("/api/v1/auth/me")).status).toBe(401);
    expect(await prisma.auditLog.count({ where: { action: "auth.password_changed" } })).toBe(1);
  });
});

describe("first steps guide", () => {
  it("is shown until the user closes it, and can be reopened", async () => {
    const { agent } = await createLoggedInUser();
    expect((await agent.get("/api/v1/auth/me")).body.data.user.onboardingCompletedAt).toBeNull();

    const done = await agent.patch("/api/v1/me").set("Origin", ORIGIN).send({ onboardingCompleted: true });
    expect(done.body.data.user.onboardingCompletedAt).not.toBeNull();
    expect((await agent.get("/api/v1/auth/me")).body.data.user.onboardingCompletedAt).not.toBeNull();

    const again = await agent.patch("/api/v1/me").set("Origin", ORIGIN).send({ onboardingCompleted: false });
    expect(again.body.data.user.onboardingCompletedAt).toBeNull();
    expect((await agent.patch("/api/v1/me").set("Origin", ORIGIN).send({})).status).toBe(422);
  });
});
