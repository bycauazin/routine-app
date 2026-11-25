import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { addDays, todayIn } from "../../src/utils/dateUtils.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

async function setup() {
  const { agent } = await createLoggedInUser();
  const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
  return { send, get: (path) => agent.get(`/api/v1${path}`) };
}

describe("simulações", () => {
  it("start as a copy of the routine, of another simulation or empty; never touch the real routine until applied", async () => {
    const u = await setup();
    const today = todayIn();
    const work = (await u.send("post", "/rules", { name: "Trabalho", weekdays: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080, startDate: today }).expect(201)).body.data;
    await u.send("post", "/rules", { name: "Rotina diária", weekdays: EVERY_DAY, startDate: today, steps: [{ name: "Ler" }], insideRuleIds: [work.id] }).expect(201);

    const copy = (await u.send("post", "/simulations", { name: "Com academia" }).expect(201)).body.data;
    expect(copy.blocks.map((b) => b.name)).toEqual(["Trabalho", "Rotina diária"]);
    const [w, list] = copy.blocks;
    expect(w.key).not.toBe(work.id);
    expect(list.insideKeys).toEqual([w.key]);

    const gym = { key: "0193a5f0-0000-7000-8000-000000000001", name: "Academia", weekdays: [1, 3, 5], startMinute: 1110, endMinute: 1200, steps: [{ name: "Cardio", minute: 1170 }] };
    const edited = (await u.send("patch", `/simulations/${copy.id}`, { blocks: [...copy.blocks, gym] }).expect(200)).body.data;
    expect(edited.blocks).toHaveLength(3);
    await u.send("patch", `/simulations/${copy.id}`, { blocks: [{ ...gym, startMinute: 1200, endMinute: 1100 }] }).expect(422);

    // The real routine did not change.
    expect((await u.get("/rules").expect(200)).body.data).toHaveLength(2);

    const empty = (await u.send("post", "/simulations", { name: "Do zero", from: "empty" }).expect(201)).body.data;
    expect(empty.blocks).toEqual([]);
    const dup = (await u.send("post", "/simulations", { name: "Cópia", from: copy.id }).expect(201)).body.data;
    expect(dup.blocks).toHaveLength(3);
    expect(dup.blocks[0].key).not.toBe(edited.blocks[0].key);
    expect((await u.get("/simulations").expect(200)).body.data).toHaveLength(3);
  });

  it("applied from a date: the old fixed items leave from that day, the blocks become fixed items with their lists", async () => {
    const u = await setup();
    const today = todayIn();
    await u.send("post", "/rules", { name: "Antigo", weekdays: EVERY_DAY, startMinute: 600, endMinute: 660, startDate: addDays(today, -7) }).expect(201);
    const sim = (await u.send("post", "/simulations", { name: "Nova", from: "empty" }).expect(201)).body.data;
    const a = "0193a5f0-0000-7000-8000-00000000000a";
    const b = "0193a5f0-0000-7000-8000-00000000000b";
    await u.send("patch", `/simulations/${sim.id}`, {
      blocks: [
        { key: b, name: "Rotina diária", weekdays: EVERY_DAY, startMinute: null, endMinute: null, steps: [{ name: "Ler" }], insideKeys: [a] },
        { key: a, name: "Condução", weekdays: [1, 3, 5], startMinute: 480, endMinute: 540 },
      ],
    }).expect(200);
    await u.send("post", `/simulations/${sim.id}/apply`, { from: addDays(today, -1) }).expect(422);
    const tomorrow = addDays(today, 1);
    expect((await u.send("post", `/simulations/${sim.id}/apply`, { from: tomorrow }).expect(200)).body.data).toEqual({ applied: 2, from: tomorrow });

    const rules = (await u.get("/rules").expect(200)).body.data;
    const names = rules.map((r) => r.name).sort();
    expect(names).toEqual(["Antigo", "Condução", "Rotina diária"]); // "Antigo" still runs today
    expect(rules.find((r) => r.name === "Antigo").endDate).toBe(today);
    const conducao = rules.find((r) => r.name === "Condução");
    expect(rules.find((r) => r.name === "Rotina diária").insideRuleIds).toEqual([conducao.id]);
    await u.send("delete", `/simulations/${sim.id}`).expect(200);
    await u.get(`/simulations/${sim.id}`).expect(404);
  });
});
