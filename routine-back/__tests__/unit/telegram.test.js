import { describe, expect, it } from "vitest";
import { parseMessage } from "../../src/services/telegram/parser.js";
import { summary } from "../../src/services/telegram/messages.js";

describe("telegram parser (rules)", () => {
  it("reads water in ml or liters", () => {
    expect(parseMessage("bebi 500")).toEqual({ intent: "water", amountMl: 500 });
    expect(parseMessage("Tomei 1,5 L")).toEqual({ intent: "water", amountMl: 1500 });
    expect(parseMessage("água 300ml")).toEqual({ intent: "water", amountMl: 300 });
    expect(parseMessage("bebi 2 litros")).toEqual({ intent: "water", amountMl: 2000 });
    expect(parseMessage("bebi 9000")).toEqual({ intent: "unknown" });
  });

  it("reads help and summary, and leaves the rest unknown", () => {
    expect(parseMessage("/ajuda")).toEqual({ intent: "help" });
    expect(parseMessage("/resumo@routine_bot")).toEqual({ intent: "summary" });
    expect(parseMessage("Resumo")).toEqual({ intent: "summary" });
    expect(parseMessage("comprar pão")).toEqual({ intent: "unknown" });
  });

  it("writes the day summary with checks, times and water, escaping names", () => {
    const text = summary({
      items: [{ name: "Acordar", startMinute: 405, status: "DONE" }, { name: "A <b>", period: "AFTERNOON", startMinute: null, status: "PENDING" }],
      anytime: [{ name: "Rotina diária", status: "PENDING", steps: [{ doneAt: 1 }, { doneAt: null }] }],
      overdue: [{}],
      water: { totalMl: 1200, goalMl: 2000 },
    });
    expect(text).toContain("✅ 06:45 Acordar");
    expect(text).toContain("▫️ Tarde A &lt;b&gt;");
    expect(text).toContain("Rotina diária (1/2)");
    expect(text).toContain("1 tarefa atrasada");
    expect(text).toContain("💧 Água: 1,2 L de 2 L");
  });
});
