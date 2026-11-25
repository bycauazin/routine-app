import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { addDays, todayIn } from "../../src/utils/dateUtils.js";
import { weekStart } from "../../src/utils/routineUtils.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

// 2026-11-23 is a Monday.
const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const bedtime = { kind: "ROUTINE", name: "Rotina de dormir", weekdays: EVERY_DAY, startMinute: 1380, endMinute: 1440, startDate: MON, steps: [{ name: "Sem telas" }, { name: "Ler" }, { name: "Banho" }] };

async function setup() {
  const { agent } = await createLoggedInUser();
  const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
  return {
    send,
    get: (path) => agent.get(`/api/v1${path}`),
    day: async (date) => (await agent.get(`/api/v1/days/${date}`).expect(200)).body.data,
    rule: async (body) => (await send("post", "/rules", body).expect(201)).body.data,
  };
}

const all = (day) => [...day.items, ...day.anytime];
const named = (day, name) => all(day).find((i) => i.name === name);

describe("routine blocks with steps (afazeres)", () => {
  it("copies the steps to each day; the block is done when every step is", async () => {
    const u = await setup();
    const rule = await u.rule(bedtime);
    expect(rule.steps.map((s) => s.name)).toEqual(["Sem telas", "Ler", "Banho"]);

    const block = named(await u.day(MON), "Rotina de dormir");
    expect(block.steps.map((s) => [s.name, s.doneAt, s.streak])).toEqual([["Sem telas", null, 0], ["Ler", null, 0], ["Banho", null, 0]]);
    const [a, b, c] = block.steps;
    const step = (s, done) => u.send("patch", `/day-items/${block.id}/steps/${s.id}`, { done }).expect(200);

    await step(a, true);
    let body = (await step(b, true)).body.data;
    expect(body.status).toBe("PENDING");
    expect((await u.day(MON)).progress).toMatchObject({ total: 3, done: 2 });
    body = (await step(c, true)).body.data;
    expect(body.status).toBe("DONE");
    body = (await step(c, false)).body.data;
    expect(body.status).toBe("PENDING");

    // The big check marks every step; back from done unchecks them all.
    body = (await u.send("patch", `/day-items/${block.id}/status`, { status: "DONE" }).expect(200)).body.data;
    expect(body.steps.every((s) => s.doneAt)).toBe(true);
    body = (await u.send("patch", `/day-items/${block.id}/status`, { status: "PENDING" }).expect(200)).body.data;
    expect(body.steps.every((s) => s.doneAt === null)).toBe(true);

    // "Não houve" is for the whole block: its steps cannot be checked and do not count.
    await u.send("patch", `/day-items/${block.id}/status`, { status: "SKIPPED" }).expect(200);
    await u.send("patch", `/day-items/${block.id}/steps/${a.id}`, { done: true }).expect(409);
    expect((await u.day(MON)).progress).toMatchObject({ total: 3, skipped: 3, percent: null });
  });

  it("each step keeps a streak of days in a row, also across 'daqui pra frente' versions", async () => {
    const u = await setup();
    const rule = await u.rule(bedtime);
    for (const date of [MON, TUE]) {
      const block = named(await u.day(date), "Rotina de dormir");
      await u.send("patch", `/day-items/${block.id}/steps/${block.steps[0].id}`, { done: true }).expect(200);
    }
    // A new step from Wednesday on; the old keys go along, so "Sem telas" keeps its streak.
    const edited = await u.send("patch", `/rules/${rule.id}`, { steps: [...rule.steps, { name: "Chá" }], from: WED }).expect(200);
    expect(edited.body.data.steps.map((s) => s.key).slice(0, 3)).toEqual(rule.steps.map((s) => s.key));
    const wed = named(await u.day(WED), "Rotina de dormir");
    expect(wed.steps.map((s) => s.name)).toEqual(["Sem telas", "Ler", "Banho", "Chá"]);
    expect(wed.steps[0].streak).toBe(2); // Wednesday still open: Monday and Tuesday count
    await u.send("patch", `/day-items/${wed.id}/steps/${wed.steps[0].id}`, { done: true }).expect(200);
    expect(named(await u.day(WED), "Rotina de dormir").steps[0].streak).toBe(3);
    expect(named(await u.day(WED), "Rotina de dormir").steps[1].streak).toBe(0);
  });

  it("a block with a step checked is kept when the rule changes; only routine blocks have steps", async () => {
    const u = await setup();
    const rule = await u.rule(bedtime);
    const tue = named(await u.day(TUE), "Rotina de dormir");
    await u.day(WED);
    await u.send("patch", `/day-items/${tue.id}/steps/${tue.steps[1].id}`, { done: true }).expect(200);
    await u.send("patch", `/rules/${rule.id}`, { name: "Dormir", from: TUE }).expect(200);
    const kept = (await u.day(TUE)).items.filter((i) => i.ruleId);
    expect(kept.map((i) => i.name)).toEqual(["Rotina de dormir"]); // touched: stays as it was
    expect(named(await u.day(WED), "Dormir")).toBeTruthy();

    await u.send("post", "/rules", { ...bedtime, kind: "WORKOUT" }).expect(422);
    await u.send("post", "/rules", { ...bedtime, steps: Array.from({ length: 21 }, (_, i) => ({ name: `Passo ${i}` })) }).expect(422);
  });
});

describe("parts of the day and tasks without a date", () => {
  it("a task can be for a part of the day, never with exact times too", async () => {
    const u = await setup();
    await u.rule({ kind: "ROUTINE", name: "Almoço", weekdays: EVERY_DAY, startMinute: 720, endMinute: 780, startDate: MON });
    const { body } = await u.send("post", `/days/${MON}/items`, { kind: "TASK", name: "Fazer comida", period: "AFTERNOON" }).expect(201);
    expect(body.data.period).toBe("AFTERNOON");
    expect((await u.day(MON)).items.map((i) => i.name)).toEqual(["Fazer comida", "Almoço"]);
    await u.send("post", `/days/${MON}/items`, { kind: "TASK", name: "X", period: "MORNING", startMinute: 600 }).expect(422);
    // Giving it a time takes the period away.
    const moved = await u.send("patch", `/day-items/${body.data.id}`, { startMinute: 600 }).expect(200);
    expect(moved.body.data).toMatchObject({ startMinute: 600, period: null });
  });

  it("'A fazer' lists the tasks without a date, today only, until they get a day or are done", async () => {
    const u = await setup();
    const today = todayIn();
    const { body } = await u.send("post", "/tasks", { name: "Renovar a CNH" }).expect(201);
    expect(body.data).toMatchObject({ kind: "TASK", date: null });
    expect((await u.day(today)).inbox.map((i) => i.name)).toEqual(["Renovar a CNH"]);
    expect((await u.day(addDays(today, 1))).inbox).toEqual([]);

    await u.send("patch", `/day-items/${body.data.id}`, { date: addDays(today, 1), period: "MORNING" }).expect(200);
    expect((await u.day(today)).inbox).toEqual([]);
    expect((await u.day(addDays(today, 1))).items.map((i) => i.name)).toEqual(["Renovar a CNH"]);

    const back = await u.send("patch", `/day-items/${body.data.id}`, { date: null }).expect(200);
    expect(back.body.data).toMatchObject({ date: null, period: null });
    await u.send("patch", `/day-items/${body.data.id}/status`, { status: "DONE" }).expect(200);
    expect((await u.day(today)).inbox).toEqual([]);

    // A rule item, or an appointment, always has a day.
    await u.rule({ kind: "ROUTINE", name: "Trabalho", weekdays: EVERY_DAY, startMinute: 540, endMinute: 1080, startDate: MON });
    const work = named(await u.day(MON), "Trabalho");
    await u.send("patch", `/day-items/${work.id}`, { date: null }).expect(422);
  });
});

describe("office or home", () => {
  const commute = { kind: "ROUTINE", name: "Condução", weekdays: [1, 2, 3, 4, 5], startMinute: 480, endMinute: 540, startDate: MON, mode: "OFFICE" };

  // Presencial/home left the product on 2026-11-24 (the mechanism stays inert until a cleanup migration),
  // and this check depends on "today" being before TUE.
  it.skip("items tied to office days only appear on them; a day can be switched and back", async () => {
    const u = await setup();
    await u.send("patch", "/routine-settings", { officeWeekdays: [2, 4] }).expect(200);
    await u.rule(commute);
    await u.rule({ ...commute, name: "Almoço em casa", mode: "HOME", startMinute: 720, endMinute: 780 });

    const mon = await u.day(MON);
    expect(mon.mode).toEqual({ value: "HOME", isDefault: true, relevant: true });
    expect(all(mon).map((i) => i.name)).toEqual(["Almoço em casa"]);
    expect(all(await u.day(TUE)).map((i) => i.name)).toEqual(["Condução"]);

    const home = (await u.send("put", `/days/${TUE}/mode`, { mode: "HOME" }).expect(200)).body.data;
    expect(home.mode).toMatchObject({ value: "HOME", isDefault: false });
    expect(all(home).map((i) => i.name)).toEqual(["Almoço em casa"]);

    // Something already done on that day stays when it switches again.
    const lunch = named(home, "Almoço em casa");
    await u.send("patch", `/day-items/${lunch.id}/status`, { status: "DONE" }).expect(200);
    const back = (await u.send("put", `/days/${TUE}/mode`, { mode: null }).expect(200)).body.data;
    expect(back.mode).toMatchObject({ value: "OFFICE", isDefault: true });
    expect(all(back).map((i) => i.name).sort()).toEqual(["Almoço em casa", "Condução"]);
  });

  it("changing the office days redoes the days already opened from today on, not the past", async () => {
    const u = await setup();
    const today = todayIn();
    const yesterday = addDays(today, -1);
    await u.rule({ ...commute, weekdays: EVERY_DAY, startDate: addDays(today, -7) });
    await u.day(yesterday);
    await u.day(addDays(today, 2));
    expect(all(await u.day(addDays(today, 2)))).toEqual([]);

    await u.send("patch", "/routine-settings", { officeWeekdays: EVERY_DAY }).expect(200);
    expect(all(await u.day(addDays(today, 2))).map((i) => i.name)).toEqual(["Condução"]);
    // The past keeps the office days it had: yesterday stays a home day, even opened again.
    expect(all(await u.day(yesterday))).toEqual([]);
    expect((await u.day(yesterday)).mode.value).toBe("HOME");
  });

  it("does not matter to someone without office days or rules tied to them", async () => {
    const u = await setup();
    expect((await u.day(MON)).mode).toEqual({ value: "HOME", isDefault: true, relevant: false });
  });
});

describe("the week", () => {
  it("is Monday to Sunday, each day with its items in order", async () => {
    const u = await setup();
    await u.rule({ name: "Muay thai", weekdays: [1, 3, 5], startMinute: 1260, endMinute: 1380, startDate: MON });
    await u.send("post", `/days/${WED}/items`, { kind: "APPOINTMENT", name: "Dentista", startMinute: 600, endMinute: 660 }).expect(201);
    const { body } = await u.get(`/weeks/${WED}`).expect(200);
    const week = body.data;
    expect([week.from, week.to]).toEqual([MON, "2026-11-29"]);
    expect(week.days.map((d) => d.date)).toEqual([MON, TUE, WED, "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]);
    expect(week.days.map((d) => d.items.length)).toEqual([1, 0, 2, 0, 1, 0, 0]);
    expect(week.days[2].items.map((i) => i.name)).toEqual(["Dentista", "Muay thai"]);
    expect(weekStart(todayIn()) <= todayIn()).toBe(true);
  });
});

describe("fixed items are blocks, steps of one day and the real time something was done", () => {
  it("every fixed item is a block; 'fiz em outro horário' keeps the real time", async () => {
    const u = await setup();
    await u.rule({ name: "Muay thai", weekdays: EVERY_DAY, startMinute: 1140, endMinute: 1200, startDate: MON });
    const workout = named(await u.day(MON), "Muay thai");
    expect(workout.kind).toBe("ROUTINE");
    const done = await u.send("patch", `/day-items/${workout.id}/status`, { status: "DONE", doneMinute: 1230 }).expect(200);
    expect(done.body.data).toMatchObject({ status: "DONE", doneMinute: 1230 });

    // Marked on a later day without saying when: the real time is unknown.
    await u.rule({ kind: "ROUTINE", name: "Estudo", weekdays: EVERY_DAY, startMinute: 1080, endMinute: 1140, startDate: MON });
    const study = named(await u.day(MON), "Estudo");
    const late = await u.send("patch", `/day-items/${study.id}/status`, { status: "DONE" }).expect(200);
    expect(late.body.data.doneMinute).toBeNull();
    await u.send("patch", `/day-items/${study.id}/status`, { status: "DONE", doneMinute: 1440 }).expect(422);
  });

  it("steps of one day: added, renamed, timed and removed only there; checks are kept", async () => {
    const u = await setup();
    await u.rule({ name: "Trabalho", weekdays: EVERY_DAY, startMinute: 780, endMinute: 1020, startDate: MON, steps: [{ name: "Ver dashboards" }] });
    const work = named(await u.day(MON), "Trabalho");
    const [dash] = work.steps;
    await u.send("patch", `/day-items/${work.id}/steps/${dash.id}`, { done: true }).expect(200);
    expect(named(await u.day(MON), "Trabalho").status).toBe("DONE");

    const { body } = await u
      .send("put", `/day-items/${work.id}/steps`, { steps: [{ id: dash.id, name: "Ver os dashboards" }, { name: "Reunião com cliente", minute: 900 }, { name: "" }] })
      .expect(200);
    expect(body.data.steps.map((s) => [s.name, s.minute, Boolean(s.doneAt)])).toEqual([
      ["Ver os dashboards", null, true],
      ["Reunião com cliente", 900, false],
    ]);
    expect(body.data.steps[0].key).toBe(dash.key);
    expect(body.data.status).toBe("PENDING"); // a new step reopens the block
    expect(body.data.isOverridden).toBe(true);

    // Only that day: the next day still follows the rule.
    expect(named(await u.day(TUE), "Trabalho").steps.map((s) => s.name)).toEqual(["Ver dashboards"]);
    // Removing the open step closes it again.
    const again = await u.send("put", `/day-items/${work.id}/steps`, { steps: [{ id: dash.id, name: "Ver os dashboards" }] }).expect(200);
    expect(again.body.data.status).toBe("DONE");
    await u.send("put", `/day-items/${work.id}/steps`, { steps: [{ name: "X", minute: 1440 }] }).expect(422);
  });

  it("a list shows inside the chosen blocks; a check there is the list's check, also after 'daqui pra frente'", async () => {
    const u = await setup();
    const commute = await u.rule({ name: "Condução", weekdays: EVERY_DAY, startMinute: 420, endMinute: 480, startDate: MON });
    const lunch = await u.rule({ name: "Almoço", weekdays: EVERY_DAY, startMinute: 720, endMinute: 780, startDate: MON });
    await u.rule({ name: "Rotina diária", weekdays: EVERY_DAY, startDate: MON, steps: [{ name: "Ler" }, { name: "Inglês" }], insideRuleIds: [commute.id, lunch.id, commute.id] });

    const day = await u.day(MON);
    const list = named(day, "Rotina diária");
    expect(list.insideRuleIds).toEqual([commute.id, lunch.id]);
    const inCommute = named(day, "Condução").lists;
    expect(inCommute).toHaveLength(1);
    expect(inCommute[0]).toMatchObject({ itemId: list.id, name: "Rotina diária" });
    expect(named(day, "Almoço").lists[0].steps.map((s) => s.name)).toEqual(["Ler", "Inglês"]);
    const { body: week } = await u.get(`/weeks/${MON}`).expect(200);
    const monday = week.data.days.find((day) => day.date === MON);
    expect(named(monday, "Condução").lists).toEqual([
      expect.objectContaining({
        itemId: list.id,
        name: list.name,
        steps: list.steps.map(({ id, name }) => expect.objectContaining({ id, name })),
      }),
    ]);

    // Checked inside Condução: checked in the list and inside Almoço too.
    for (const step of inCommute[0].steps) await u.send("patch", `/day-items/${list.id}/steps/${step.id}`, { done: true }).expect(200);
    const after = await u.day(MON);
    expect(named(after, "Rotina diária").status).toBe("DONE");
    expect(named(after, "Almoço").lists[0].steps.every((s) => s.doneAt)).toBe(true);

    // The block changes from Tuesday on: the list still shows inside the new version.
    await u.send("patch", `/rules/${commute.id}`, { startMinute: 450, from: TUE }).expect(200);
    expect(named(await u.day(TUE), "Condução").lists[0].name).toBe("Rotina diária");
    expect(named(await u.day(MON), "Condução").lists[0].name).toBe("Rotina diária");

    await u.send("post", "/rules", { name: "Lista", weekdays: EVERY_DAY, startDate: MON, steps: [{ name: "X" }], insideRuleIds: ["01a2105d-5344-7798-8def-5de5f2bc1336"] }).expect(422);
  });

  it("'daqui pra frente' only on some weekdays splits the fixed item in two", async () => {
    const u = await setup();
    const commute = await u.rule({ name: "Condução", weekdays: [1, 2, 3], startMinute: 480, endMinute: 540, startDate: MON });
    const wake = await u.rule({ name: "Acordar", weekdays: [1, 2, 3], startMinute: 420, endMinute: 480, startDate: MON });
    await u.rule({ name: "Rotina diária", weekdays: EVERY_DAY, startDate: MON, steps: [{ name: "Ler" }], insideRuleIds: [wake.id] });

    const { body } = await u.send("post", `/rules/${wake.id}/split`, { weekdays: [1, 3], startMinute: 405, endMinute: 465, from: MON }).expect(201);
    expect(body.data).toMatchObject({ name: "Acordar", weekdays: [1, 3], startMinute: 405 });
    expect(named(await u.day(MON), "Acordar").startMinute).toBe(405);
    expect(named(await u.day(TUE), "Acordar").startMinute).toBe(420);
    expect(named(await u.day(WED), "Acordar").startMinute).toBe(405);
    expect(named(await u.day(MON), "Acordar").lists[0].name).toBe("Rotina diária");
    expect(named(await u.day(TUE), "Acordar").lists[0].name).toBe("Rotina diária");
    await u.send("post", `/rules/${commute.id}/split`, { weekdays: [5], from: MON }).expect(422);
  });

  it("someone else's step or day cannot be touched", async () => {
    const owner = await setup();
    const other = await setup();
    await owner.rule(bedtime);
    const block = named(await owner.day(MON), "Rotina de dormir");
    await other.send("patch", `/day-items/${block.id}/steps/${block.steps[0].id}`, { done: true }).expect(404);
    await other.send("patch", `/day-items/${block.id}/status`, { status: "DONE" }).expect(404);
  });
});
