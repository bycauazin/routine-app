import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

async function setup() {
  const { agent } = await createLoggedInUser();
  const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
  const names = async (date) => {
    const day = (await agent.get(`/api/v1/days/${date}`).expect(200)).body.data;
    return { day, names: [...day.items, ...day.anytime].map((i) => i.name).sort() };
  };
  return { send, get: (path) => agent.get(`/api/v1${path}`), names };
}

describe("dias especiais", () => {
  it("fixed items that skip special days leave them; the others stay; unmarking brings them back", async () => {
    const u = await setup();
    await u.send("post", "/rules", { name: "Trabalho", weekdays: EVERY_DAY, startMinute: 540, endMinute: 1080, startDate: MON, skipOnHolidays: true }).expect(201);
    await u.send("post", "/rules", { name: "Rotina de dormir", weekdays: EVERY_DAY, startMinute: 1380, endMinute: 1440, startDate: MON }).expect(201);
    expect((await u.names(TUE)).names).toEqual(["Rotina de dormir", "Trabalho"]); // opened before marking

    const { body } = await u.send("post", "/special-days", { kind: "VACATION", from: TUE, to: WED, name: "Férias de fim de ano" }).expect(201);
    const tue = await u.names(TUE);
    expect(tue.names).toEqual(["Rotina de dormir"]);
    expect(tue.day.special).toEqual({ id: body.data.id, kind: "VACATION", name: "Férias de fim de ano" });
    expect((await u.names(WED)).names).toEqual(["Rotina de dormir"]);
    expect((await u.names(MON)).names).toEqual(["Rotina de dormir", "Trabalho"]);
    expect((await u.get("/weeks/2026-11-25").expect(200)).body.data.days[1].special.kind).toBe("VACATION");

    await u.send("post", "/special-days", { kind: "SICK", from: WED, to: TUE }).expect(422);
    await u.send("delete", `/special-days/${body.data.id}`).expect(200);
    expect((await u.names(TUE)).names).toEqual(["Rotina de dormir", "Trabalho"]);
    expect((await u.get("/special-days").expect(200)).body.data).toEqual([]);
  });
});
