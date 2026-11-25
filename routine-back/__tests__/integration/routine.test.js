import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { addDays, todayIn } from "../../src/utils/dateUtils.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

// 2026-11-23 is a Monday.
const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const FRI = "2026-11-27";
const muayThai = { kind: "ROUTINE", name: "Muay thai", weekdays: [1, 3, 5], startMinute: 1260, endMinute: 1380, startDate: MON };

async function setup() {
  const { agent } = await createLoggedInUser();
  const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
  return {
    get: (path) => agent.get(`/api/v1${path}`),
    send,
    day: async (date) => (await agent.get(`/api/v1/days/${date}`).expect(200)).body.data,
    rule: async (body) => (await send("post", "/rules", body).expect(201)).body.data,
  };
}

describe("categories", () => {
  it("every user starts with the default ones; a used category is archived, not deleted", async () => {
    const u = await setup();
    const categories = (await u.get("/categories").expect(200)).body.data;
    expect(categories.map((c) => c.name)).toEqual(["Rotina diária", "Trabalho", "Condução", "Estudo", "Aulas", "Treino", "Refeição", "Pessoal"]);
    const workout = categories.find((c) => c.name === "Treino");

    const rule = await u.rule({ ...muayThai, categoryId: workout.id });
    const [item] = (await u.day(MON)).items;
    await u.send("delete", `/categories/${workout.id}`).expect(409);
    await u.send("patch", `/categories/${workout.id}`, { isArchived: true }).expect(200);
    await u.send("post", "/rules", { ...muayThai, categoryId: workout.id }).expect(422);
    const edited = await u.send("patch", `/rules/${rule.id}`, { name: "Treino revisado", from: WED }).expect(200);
    expect(edited.body.data.categoryId).toBe(workout.id);
    const editedDay = await u.send("patch", `/day-items/${item.id}`, { name: "Treino de hoje", categoryId: workout.id }).expect(200);
    expect(editedDay.body.data.category.id).toBe(workout.id);

    const { body } = await u.send("post", "/categories", { name: "Igreja", colorKey: "personal", icon: "sparkles" }).expect(201);
    await u.send("delete", `/categories/${body.data.id}`).expect(204);
    await u.send("post", "/categories", { name: "Hex", colorKey: "#ff0000", icon: "tag" }).expect(422);
  });

  it("someone else's category cannot be used", async () => {
    const owner = await setup();
    const other = await setup();
    const [category] = (await owner.get("/categories")).body.data;
    await other.send("post", "/rules", { ...muayThai, categoryId: category.id }).expect(422);
    await other.send("patch", `/categories/${category.id}`, { name: "Minha" }).expect(404);
  });
});

describe("rules and the day", () => {
  it("makes the items of a day once, only on the rule's weekdays", async () => {
    const u = await setup();
    await u.rule(muayThai);
    const monday = await u.day(MON);
    expect(monday.items).toHaveLength(1);
    expect(monday.items[0]).toMatchObject({ name: "Muay thai", kind: "ROUTINE", startMinute: 1260, endMinute: 1380, status: "PENDING", originDate: MON });
    expect((await u.day(MON)).items).toHaveLength(1); // opening again does not duplicate
    expect(await prisma.dayItem.count()).toBe(1);

    const tuesday = await u.day(TUE);
    expect(tuesday.items).toEqual([]);
    expect(tuesday.progress.percent).toBeNull(); // a free day is not a failure
  });

  it("rejects times that end before they start, and no weekday", async () => {
    const u = await setup();
    await u.send("post", "/rules", { ...muayThai, startMinute: 1380, endMinute: 60 }).expect(422);
    await u.send("post", "/rules", { ...muayThai, weekdays: [] }).expect(422);
  });

  it("feito, não houve and the progress; a skipped item never comes back", async () => {
    const u = await setup();
    await u.rule(muayThai);
    await u.rule({ kind: "ROUTINE", name: "Acordar", weekdays: [1, 2, 3, 4, 5], startMinute: 420, endMinute: 480, startDate: MON });
    const day = await u.day(MON);
    expect(day.items.map((i) => i.name)).toEqual(["Acordar", "Muay thai"]);

    await u.send("patch", `/day-items/${day.items[0].id}/status`, { status: "DONE" }).expect(200);
    const skipped = await u.send("patch", `/day-items/${day.items[1].id}/status`, { status: "SKIPPED", reason: "Academia fechada" }).expect(200);
    expect(skipped.body.data).toMatchObject({ status: "SKIPPED", skipReason: "Academia fechada" });

    const after = await u.day(MON);
    expect(after.items.map((i) => i.status)).toEqual(["DONE", "SKIPPED"]);
    expect(after.progress).toEqual({ total: 2, done: 1, skipped: 1, pending: 0, percent: 100 });
    expect(after.items[0].doneAt).toBeTruthy();
  });

  it("'daqui pra frente' keeps the past and what was already done", async () => {
    const u = await setup();
    const rule = await u.rule(muayThai);
    await u.day(MON);
    const wed = await u.day(WED);
    await u.send("patch", `/day-items/${wed.items[0].id}/status`, { status: "DONE" }).expect(200);

    const { body } = await u.send("patch", `/rules/${rule.id}`, { startMinute: 1200, endMinute: 1320, from: WED }).expect(200);
    expect(body.data).toMatchObject({ startDate: WED, startMinute: 1200 });

    expect((await u.day(MON)).items[0]).toMatchObject({ startMinute: 1260, ruleId: rule.id });
    const wedAfter = (await u.day(WED)).items;
    expect(wedAfter).toHaveLength(1);
    expect(wedAfter[0]).toMatchObject({ status: "DONE", startMinute: 1260, ruleId: body.data.id });
    expect((await u.day(FRI)).items[0]).toMatchObject({ startMinute: 1200, status: "PENDING" });

    // The old one ends the day before (read from the database: the list only shows rules still running today).
    const old = await prisma.routineRule.findUnique({ where: { id: rule.id }, select: { endDate: true } });
    expect(old.endDate.toISOString().slice(0, 10)).toBe(TUE);
  });

  it("removing from a day on takes the future away and keeps the past", async () => {
    const u = await setup();
    const rule = await u.rule(muayThai);
    await u.day(MON);
    await u.day(FRI);
    await u.send("delete", `/rules/${rule.id}?from=${WED}`).expect(204);
    expect((await u.day(MON)).items).toHaveLength(1);
    expect((await u.day(WED)).items).toEqual([]);
    expect((await u.day(FRI)).items).toEqual([]);
  });

  it("removing from its first day deletes the rule; done items stay as one-off items", async () => {
    const u = await setup();
    const rule = await u.rule(muayThai);
    const mon = await u.day(MON);
    await u.send("patch", `/day-items/${mon.items[0].id}/status`, { status: "DONE" }).expect(200);
    await u.day(WED);
    await u.send("delete", `/rules/${rule.id}?from=${MON}`).expect(204);
    expect(await prisma.routineRule.count()).toBe(0);
    expect((await u.day(MON)).items[0]).toMatchObject({ status: "DONE", ruleId: null });
    expect((await u.day(WED)).items).toEqual([]);
  });
});

describe("items of the day", () => {
  it("'só hoje', atrasar and remarcar change only that item", async () => {
    const u = await setup();
    await u.rule(muayThai);
    const [item] = (await u.day(MON)).items;

    const late = await u.send("post", `/day-items/${item.id}/shift`, { minutes: 30 }).expect(200);
    expect(late.body.data).toMatchObject({ startMinute: 1290, endMinute: 1410, isOverridden: true });
    await u.send("post", `/day-items/${item.id}/shift`, { minutes: 60 }).expect(422); // would pass midnight

    await u.send("patch", `/day-items/${item.id}`, { name: "Muay thai (aula extra)" }).expect(200);
    const moved = await u.send("patch", `/day-items/${item.id}`, { date: TUE, startMinute: 1140, endMinute: 1260 }).expect(200);
    expect(moved.body.data).toMatchObject({ date: TUE, originDate: MON, startMinute: 1140 });

    expect((await u.day(MON)).items).toEqual([]); // moved away and not made again
    expect((await u.day(TUE)).items[0].name).toBe("Muay thai (aula extra)");
    expect((await u.day(WED)).items[0]).toMatchObject({ name: "Muay thai", startMinute: 1260 });

    await u.send("delete", `/day-items/${item.id}`).expect(409); // rule items are "não houve", not deleted
  });

  it("one-off tasks: with or without time; late ones show on today until done", async () => {
    const u = await setup();
    const today = todayIn();
    const yesterday = addDays(today, -1);
    const { body: late } = await u.send("post", `/days/${yesterday}/items`, { kind: "TASK", name: "Ligar pro banco" }).expect(201);
    await u.send("post", `/days/${today}/items`, { kind: "APPOINTMENT", name: "Dentista", startMinute: 600, endMinute: 660 }).expect(201);
    await u.send("post", `/days/${today}/items`, { kind: "TASK", name: "Comprar presente" }).expect(201);

    const day = await u.day(today);
    expect(day.items.map((i) => i.name)).toEqual(["Dentista"]);
    expect(day.anytime.map((i) => i.name)).toEqual(["Comprar presente"]);
    expect(day.overdue.map((i) => i.name)).toEqual(["Ligar pro banco"]);
    expect((await u.day(yesterday)).overdue).toEqual([]); // only today shows late tasks

    // A fixed task missed yesterday is "não feita" there, not late: it comes back today by itself.
    await u.rule({ kind: "ROUTINE", name: "Ler 2 páginas", weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: yesterday });
    await u.day(yesterday);
    const withFixed = await u.day(today);
    expect(withFixed.overdue.map((i) => i.name)).toEqual(["Ligar pro banco"]);
    expect(withFixed.anytime.map((i) => i.name)).toContain("Ler 2 páginas");

    await u.send("patch", `/day-items/${late.data.id}/status`, { status: "DONE" }).expect(200);
    expect((await u.day(today)).overdue).toEqual([]);
    await u.send("delete", `/day-items/${late.data.id}`).expect(204);
    await u.send("post", `/days/${today}/items`, { kind: "WORKOUT", name: "Correr" }).expect(422);
  });

  it("another user's items are not found", async () => {
    const owner = await setup();
    const other = await setup();
    const today = todayIn();
    const { body } = await owner.send("post", `/days/${today}/items`, { kind: "TASK", name: "Minha tarefa" }).expect(201);
    await other.send("patch", `/day-items/${body.data.id}/status`, { status: "DONE" }).expect(404);
    await other.send("patch", `/day-items/${body.data.id}`, { name: "x" }).expect(404);
    await other.send("delete", `/day-items/${body.data.id}`).expect(404);
    expect((await other.day(today)).anytime).toEqual([]);
  });
});
