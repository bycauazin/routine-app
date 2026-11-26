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

  it("reads tasks, done and imprevistos with day, period and time (7B)", () => {
    const WED = "2026-11-25";
    expect(parseMessage("anotar comprar pão amanhã de manhã", WED)).toMatchObject({ intent: "task", name: "Comprar pão", date: "2026-11-26", period: "MORNING", startMinute: null });
    expect(parseMessage("anotar ligar pro banco", WED)).toMatchObject({ intent: "task", name: "Ligar pro banco", date: null });
    expect(parseMessage("anota dentista dia 3/12 às 15h", WED)).toMatchObject({ name: "Dentista", date: "2026-12-03", startMinute: 900 });
    expect(parseMessage("lembrar de pagar conta sexta-feira", WED)).toMatchObject({ name: "Pagar conta", date: "2026-11-27" });
    expect(parseMessage("fiz treino", WED)).toEqual({ intent: "done", query: "treino" });
    expect(parseMessage("freelance sábado 14h às 21h", WED)).toEqual({ intent: "unplanned", name: "Freelance", date: "2026-11-28", startMinute: 840, endMinute: 1260 });
    expect(parseMessage("imprevisto trânsito 18h às 19h30", WED)).toEqual({ intent: "unplanned", name: "Trânsito", date: WED, startMinute: 1080, endMinute: 1170 });
    expect(parseMessage("imprevisto cano estourado", WED)).toMatchObject({ intent: "unplanned", startMinute: null });
  });

  it("only trusts checked AI readings (7C)", async () => {
    const { toParsed } = await import("../../src/services/telegram/ai.js");
    const today = "2026-11-25";
    const base = { name: "", date: null, start_time: null, end_time: null, period: null, amount_ml: 0 };
    expect(toParsed({ ...base, intent: "task", name: "comprar ração", date: "2026-11-30" }, { today })).toMatchObject({ intent: "task", name: "Comprar ração", date: "2026-11-30", viaAI: true });
    expect(toParsed({ ...base, intent: "task", name: "x", date: "2020-01-01" }, { today }).date).toBeNull();
    expect(toParsed({ ...base, intent: "unplanned", name: "trânsito", start_time: "18:00", end_time: "17:00" }, { today })).toBeNull();
    expect(toParsed({ ...base, intent: "water", amount_ml: 250 }, { today })).toEqual({ intent: "water", amountMl: 250, viaAI: true });
    expect(toParsed({ ...base, intent: "none" }, { today })).toBeNull();
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
