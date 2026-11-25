import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { civilDateToDb, addDays, todayIn } from "../../src/utils/dateUtils.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function setup() {
  const { agent, user } = await createLoggedInUser();
  const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
  return { send, get: (path) => agent.get(`/api/v1${path}`), user };
}

describe("water (stage 4)", () => {
  it("logs typed in ml, the total against the goal, undo the last one and remove any", async () => {
    const u = await setup();
    const today = todayIn();
    const empty = (await u.get(`/water/${today}`).expect(200)).body.data;
    expect(empty).toMatchObject({ date: today, goalMl: 2000, totalMl: 0, logs: [], streak: { current: 0, best: 0 } });

    await u.send("post", "/water", { amountMl: 300 }).expect(201);
    const two = (await u.send("post", "/water", { amountMl: 500 }).expect(201)).body.data;
    expect(two.totalMl).toBe(800);
    expect(two.logs.map((l) => l.amountMl)).toEqual([300, 500]);

    const undone = (await u.send("delete", "/water/last").expect(200)).body.data;
    expect(undone.logs.map((l) => l.amountMl)).toEqual([300]);
    const removed = (await u.send("delete", `/water/logs/${undone.logs[0].id}`).expect(200)).body.data;
    expect(removed.totalMl).toBe(0);
    await u.send("delete", "/water/last").expect(404);

    await u.send("post", "/water", { amountMl: 0 }).expect(422);
    await u.send("post", "/water", { amountMl: 6000 }).expect(422);

    // The Dia shows the line "x de y".
    await u.send("post", "/water", { amountMl: 1200 }).expect(201);
    expect((await u.get(`/days/${today}`).expect(200)).body.data.water).toEqual({ totalMl: 1200, goalMl: 2000 });
  });

  it("the streak counts days that reached the goal from the first log on; today only once reached", async () => {
    const u = await setup();
    const today = todayIn();
    const at = (date, amountMl) => prisma.waterLog.create({ data: { userId: u.user.id, date: civilDateToDb(date), amountMl } });
    await at(addDays(today, -4), 2500); // reached
    // -3: no log → missed, breaks the run
    await at(addDays(today, -2), 2000);
    await at(addDays(today, -1), 1000);
    await at(addDays(today, -1), 1000);

    const day = (await u.get(`/water/${today}`).expect(200)).body.data;
    expect(day.streak).toEqual({ current: 2, best: 2 });
    const goal = (await u.send("patch", "/water/goal", { goalMl: 1500 }).expect(200)).body.data;
    expect(goal.goalMl).toBe(1500);

    const after = (await u.send("post", "/water", { amountMl: 1500 }).expect(201)).body.data;
    expect(after.streak).toEqual({ current: 3, best: 3 });
    await u.send("patch", "/water/goal", { goalMl: 100 }).expect(422);
  });
});
