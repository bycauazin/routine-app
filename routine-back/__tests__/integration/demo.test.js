import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { DEMO_MAX_PER_IP, isDemoEmail } from "../../src/shared/constants.js";
import { ORIGIN, app, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const openDemo = (agent) => agent.post("/api/v1/auth/demo").set("Origin", ORIGIN).send();
const demoCount = () => prisma.user.count({ where: { demoExpiresAt: { not: null } } });

describe("demonstration accounts", () => {
  it("opens from the login screen for anyone, as a fictional person who started weeks ago", { timeout: 60_000 }, async () => {
    expect((await request(app).get("/api/v1/auth/options")).body.data.demoEnabled).toBe(true);

    const agent = request.agent(app);
    const res = await openDemo(agent);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ demo: true, role: "USER", name: "Marina Costa" });
    expect(isDemoEmail(res.body.data.user.email)).toBe(true);

    const me = await agent.get("/api/v1/auth/me");
    expect(me.body.data.user.demo).toBe(true);
    expect(me.body.data.user.onboardingCompletedAt).not.toBeNull();
    const demo = await prisma.user.findUnique({ where: { email: res.body.data.user.email } });
    expect(Date.now() - demo.createdAt.getTime()).toBeGreaterThan(14 * 86_400_000);

    // Her routine: fixed items, weeks of history (mostly done), and today with a late task.
    expect((await agent.get("/api/v1/rules")).body.data.length).toBeGreaterThanOrEqual(8);
    const past = await prisma.dayItem.groupBy({ by: ["status"], where: { userId: demo.id }, _count: true });
    const count = Object.fromEntries(past.map((p) => [p.status, p._count]));
    expect(count.DONE).toBeGreaterThan(count.PENDING);
    expect(count.SKIPPED).toBeGreaterThan(0);
    const { todayIn } = await import("../../src/utils/dateUtils.js");
    const today = (await agent.get(`/api/v1/days/${todayIn()}`)).body.data;
    expect(today.overdue.map((i) => i.name)).toContain("Marcar dentista");
    expect(today.anytime.map((i) => i.name)).toContain("Comprar presente da Ju");
  });

  it("gives each visitor their own copy, and leaving deletes it", { timeout: 90_000 }, async () => {
    const one = request.agent(app);
    const two = request.agent(app);
    const a = (await openDemo(one)).body.data.user;
    const b = (await openDemo(two)).body.data.user;
    expect(a.id).not.toBe(b.id);

    // What one visitor types never shows up for the other.
    expect((await one.patch("/api/v1/me").set("Origin", ORIGIN).send({ name: "Mexeram aqui" })).status).toBe(200);
    expect((await two.get("/api/v1/auth/me")).body.data.user.name).toBe("Marina Costa");

    expect((await one.post("/api/v1/auth/logout").set("Origin", ORIGIN).send()).status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await prisma.userSettings.count({ where: { userId: a.id } })).toBe(0);
    expect((await two.get("/api/v1/auth/me")).status).toBe(200);
  });

  it("stops working when its time is up and is removed when the next demo opens", { timeout: 90_000 }, async () => {
    const agent = request.agent(app);
    const old = (await openDemo(agent)).body.data.user;
    await prisma.user.update({ where: { id: old.id }, data: { demoExpiresAt: new Date(Date.now() - 1000) } });
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);

    await openDemo(request.agent(app));
    expect(await prisma.user.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await demoCount()).toBe(1);
  });

  it("signs out whoever was signed in on the device, without touching their account", { timeout: 60_000 }, async () => {
    const { agent, user } = await createLoggedInUser();
    expect((await openDemo(agent)).status).toBe(200);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect((await agent.get("/api/v1/auth/me")).body.data.user.demo).toBe(true);
  });

  it("limits how many demos one address opens", { timeout: 120_000 }, async () => {
    for (let i = 0; i < DEMO_MAX_PER_IP; i++) expect((await openDemo(request.agent(app))).status).toBe(200);
    expect((await openDemo(request.agent(app))).status).toBe(429);
  });

  it("cannot be reached with a password and does not allow account settings", { timeout: 60_000 }, async () => {
    const agent = request.agent(app);
    const { email } = (await openDemo(agent)).body.data.user;
    const login = await request(app).post("/api/v1/auth/login").set("Origin", ORIGIN).send({ email, password: "qualquer-coisa-123" });
    expect(login.status).toBe(401);
    const reset = await request(app).post("/api/v1/auth/forgot-password").set("Origin", ORIGIN).send({ email });
    expect(reset.status).toBe(204);
    expect(await prisma.authToken.count()).toBe(0);

    const blocked = [
      agent.put("/api/v1/me/password").set("Origin", ORIGIN).send({ currentPassword: "x", newPassword: "nova-senha-forte-123" }),
      agent.put("/api/v1/me/email").set("Origin", ORIGIN).send({ currentPassword: "x", newEmail: "novo@example.com" }),
      agent.post("/api/v1/me/two-factor/setup").set("Origin", ORIGIN).send({ currentPassword: "x" }),
      agent.delete("/api/v1/me").set("Origin", ORIGIN).send({ currentPassword: "x" }),
      agent.get("/api/v1/admin/users"),
    ];
    const statuses = (await Promise.all(blocked)).map((r) => r.status);
    expect(statuses).toEqual([403, 403, 403, 403, 404]);
    // Using the app itself works.
    expect((await agent.patch("/api/v1/me").set("Origin", ORIGIN).send({ onboardingCompleted: true })).status).toBe(200);
  });
});
