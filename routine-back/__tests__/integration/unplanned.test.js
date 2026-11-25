import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { ORIGIN, createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const SAT = "2026-11-21";

describe("imprevistos", () => {
  it("takes the planned items it covers; they still count, the report says why; deleting unlinks", async () => {
    const { agent } = await createLoggedInUser();
    const send = (method, path, body) => agent[method](`/api/v1${path}`).set("Origin", ORIGIN).send(body);
    await send("post", "/rules", { name: "Estudo", weekdays: [6], startMinute: 900, endMinute: 960, startDate: SAT }).expect(201);
    await send("post", "/rules", { name: "Rotina de dormir", weekdays: [6], startMinute: 1380, endMinute: 1440, startDate: SAT }).expect(201);
    const before = (await agent.get(`/api/v1/days/${SAT}`).expect(200)).body.data;
    const study = before.items.find((i) => i.name === "Estudo");

    await send("post", `/days/${SAT}/items`, { kind: "APPOINTMENT", name: "Freelance", unplanned: true }).expect(422);
    const { body } = await send("post", `/days/${SAT}/items`, { kind: "APPOINTMENT", name: "Freelance", unplanned: true, startMinute: 840, endMinute: 1260, displaceIds: [study.id] }).expect(201);
    expect(body.data).toMatchObject({ isUnplanned: true, status: "DONE" });

    const day = (await agent.get(`/api/v1/days/${SAT}`).expect(200)).body.data;
    expect(day.items.find((i) => i.name === "Estudo").displacedBy).toEqual({ id: body.data.id, name: "Freelance" });
    expect(day.progress.total).toBe(2); // the imprevisto is not in the score

    const report = (await agent.get(`/api/v1/reports?from=${SAT}&to=${SAT}`).expect(200)).body.data;
    expect(report.unplanned).toMatchObject({ count: 1, minutes: 420, missed: 1 });
    expect(report.unplanned.list[0].taken).toEqual([{ name: "Estudo", status: "PENDING" }]);
    expect(report.progress.total).toBe(2);

    await send("delete", `/day-items/${body.data.id}`).expect(204);
    const after = (await agent.get(`/api/v1/days/${SAT}`).expect(200)).body.data;
    expect(after.items.find((i) => i.name === "Estudo").displacedById).toBeNull();
  });
});
