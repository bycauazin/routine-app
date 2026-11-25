import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { addDays, todayIn } from "../../src/utils/dateUtils.js";
import { createLoggedInUser, ORIGIN, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function user() {
  const { agent } = await createLoggedInUser();
  const path = (route) => `/api/v1${route}`;
  return {
    get: (route) => agent.get(path(route)),
    send: (method, route, body) => agent[method](path(route)).set("Origin", ORIGIN).send(body),
  };
}

const daysAgo = (days) => addDays(todayIn(), -days);
const range = (from, to = from) => `?from=${from}&to=${to}`;
const week = [0, 1, 2, 3, 4, 5, 6];

describe("reports, personal goals and pending-day review", () => {
  it("uses checked steps, planned duration, missed, actual lateness and original slots for rescheduling", async () => {
    const u = await user();
    const date = daysAgo(2);
    const next = daysAgo(1);
    const { body: rule } = await u.send("post", "/rules", {
      name: "Leitura", weekdays: week, startDate: date, endDate: date,
      startMinute: 750, endMinute: 810, steps: [{ name: "Ler" }, { name: "Revisar" }],
    }).expect(201);
    const { body: day } = await u.get(`/days/${date}`).expect(200);
    const reading = day.data.items.find((item) => item.ruleId === rule.data.id);
    await u.send("patch", `/day-items/${reading.id}/steps/${reading.steps[0].id}`, { done: true }).expect(200);
    const make = async (name, hour) => (await u.send("post", `/days/${date}/items`, {
      name, kind: "APPOINTMENT", startMinute: hour * 60, endMinute: hour * 60 + 30,
    }).expect(201)).body.data;
    const done = await make("Feito depois", 9);
    const moved = await make("Remarcado", 10);
    const skipped = await make("Não houve", 11);
    await u.send("patch", `/day-items/${done.id}/status`, { status: "DONE", doneMinute: 600 }).expect(200);
    await u.send("patch", `/day-items/${skipped.id}/status`, { status: "SKIPPED" }).expect(200);
    await u.send("post", `/day-items/${moved.id}/shift`, { minutes: 30 }).expect(200);
    await u.send("patch", `/day-items/${moved.id}`, { date: next }).expect(200);
    await u.send("post", "/water", { date, amountMl: 2100 }).expect(201);
    const { body } = await u.get("/reports" + range(date)).expect(200);
    expect(body.data.progress).toMatchObject({ total: 4, skipped: 1, done: 2, percent: 67 });
    expect(body.data.score).toBe(6.7);
    expect(body.data.categories[0]).toMatchObject({ minutes: 30, percent: 67 });
    expect(body.data.water).toMatchObject({ averageMl: 2100, reached: 1, days: 1 });
    expect(body.data.delays.totals).toEqual({ missed: 1, late: 1, moved: 1 });
    expect(body.data.delays.cells).toEqual(expect.arrayContaining([
      expect.objectContaining({ hour: 9, late: 1 }), expect.objectContaining({ hour: 10, moved: 1 }),
    ]));
    expect(body.data.streaks.find((step) => step.name === "Ler")).toMatchObject({ current: 1, best: 1, percent: 100 });
    const future = addDays(todayIn(), 1);
    const futureReport = (await u.get("/reports" + range(future)).expect(200)).body.data;
    expect(futureReport).toMatchObject({ through: null, days: [], score: null });
  });

  it("tracks an item through recurring edits, validates goals and isolates writes by user", async () => {
    const a = await user();
    const b = await user();
    const from = daysAgo(2);
    const to = daysAgo(1);
    const rule = (await a.send("post", "/rules", { name: "Caminhar", weekdays: week, startDate: from }).expect(201)).body.data;
    const target = (await a.get("/goals/options").expect(200)).body.data.ITEM.find((item) => item.label === "Caminhar");
    const goal = { name: "Caminhar todos os dias", subject: "ITEM", targetKey: target.id, unit: "PERCENT", amount: 100, period: "DAY" };
    const saved = (await a.send("post", "/goals", goal).expect(201)).body.data;
    await b.send("post", "/goals", goal).expect(422);
    await b.send("put", `/goals/${saved.id}`, goal).expect(404);
    await b.send("delete", `/goals/${saved.id}`).expect(404);
    await a.send("put", `/goals/${saved.id}`, { ...goal, amount: 101 }).expect(422);
    await a.send("patch", `/rules/${rule.id}`, { from: to, name: "Passear" }).expect(200);
    const item = (await a.get(`/days/${to}`).expect(200)).body.data.anytime.find((item) => item.name === "Passear");
    await a.send("patch", `/day-items/${item.id}/status`, { status: "DONE" }).expect(200);
    const results = (await a.get("/reports" + range(from, to)).expect(200)).body.data.goals[0].results;
    expect(results.map(({ value, reached }) => [value, reached])).toEqual([[0, false], [100, true]]);
    await a.send("delete", `/goals/${saved.id}`).expect(204);
  });

  it("breaks an afazer streak when a scheduled day between two completions was never opened", async () => {
    const u = await user();
    const first = daysAgo(3);
    const last = daysAgo(1);
    await u.send("post", "/rules", { name: "Leitura", weekdays: week, startDate: first, steps: [{ name: "Ler" }] }).expect(201);
    for (const date of [first, last]) {
      const block = (await u.get(`/days/${date}`).expect(200)).body.data.anytime.find((item) => item.name === "Leitura");
      await u.send("patch", `/day-items/${block.id}/status`, { status: "DONE" }).expect(200);
    }
    const report = (await u.get("/reports" + range(last)).expect(200)).body.data;
    expect(report.streaks[0]).toMatchObject({ name: "Ler", current: 1, best: 1 });
  });

  it("reviews a batch atomically, removes reviewed misses from the queue and keeps them in the report", async () => {
    const a = await user();
    const b = await user();
    const date = daysAgo(1);
    const items = [];
    for (const name of ["Esqueci", "Concluí", "Não aconteceu"]) {
      items.push((await a.send("post", `/days/${date}/items`, { name, kind: "TASK" }).expect(201)).body.data.id);
    }
    const [missed, done, skipped] = items;
    const path = `/reports/pending/${date}`;
    await b.send("post", path, { ids: [missed], status: "DONE" }).expect(404);
    await a.send("post", path, { ids: [missed, crypto.randomUUID()], status: "DONE" }).expect(404);
    await a.send("post", path, { ids: [missed], status: "NOT_DONE" }).expect(204);
    await a.send("post", path, { ids: [missed], status: "NOT_DONE" }).expect(204);
    await a.send("post", path, { ids: [done], status: "DONE" }).expect(204);
    await a.send("post", path, { ids: [skipped], status: "SKIPPED" }).expect(204);
    const pending = (await a.get("/reports/pending" + range(date)).expect(200)).body.data;
    expect(pending.days).toEqual([]);
    const report = (await a.get("/reports" + range(date)).expect(200)).body.data;
    expect(report.progress).toMatchObject({ total: 3, skipped: 1, done: 1, percent: 50 });
    expect(report.delays.totals.missed).toBe(1);
  });
});
