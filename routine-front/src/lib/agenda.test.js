import { describe, expect, it } from "vitest";
import { BAND_INSET, bandInset, layoutDay, periodBands } from "./agenda";

const item = (name, startMinute, endMinute = null) => ({ name, startMinute, endMinute });
const columns = (placed) => Object.fromEntries(placed.map((p) => [p.item.name, `${p.column}/${p.columns}`]));

describe("layoutDay", () => {
  it("keeps items that do not overlap at full width", () => {
    expect(columns(layoutDay([item("Acordar", 420, 480), item("Trabalho", 540, 1080)]))).toEqual({ Acordar: "0/1", Trabalho: "0/1" });
  });

  it("puts items at the same time side by side", () => {
    expect(columns(layoutDay([item("Trabalho", 540, 1080), item("Reunião", 600, 660), item("Almoço", 720, 780)]))).toEqual({
      Trabalho: "0/2",
      Reunião: "1/2",
      Almoço: "1/2", // the free column after the meeting is used again
    });
  });

  it("gives a short item (or one without an end) a readable height, and never passes midnight", () => {
    const [a, b] = layoutDay([item("Remédio", 600), item("Dormir", 1430, 1440)]);
    expect([a.start, a.end]).toEqual([600, 630]);
    expect([b.start, b.end]).toEqual([1430, 1440]);
  });

  it("starts a new group after a gap and ignores items without a time", () => {
    const placed = layoutDay([item("A", 60, 120), item("B", 90, 150), item("C", 200, 260), item("Ler", null)]);
    expect(columns(placed)).toEqual({ A: "0/2", B: "1/2", C: "0/1" });
  });
});

describe("periodBands", () => {
  const part = (name, period) => ({ name, period, startMinute: null, endMinute: null });

  it("makes each part of the day a band the whole period tall, sharing the width inside one period", () => {
    const bands = periodBands([part("Comida", "MORNING"), part("Leitura", "MORNING"), part("Estudo", "EVENING"), item("Reunião", 600, 660)]);
    expect(bands.map((b) => [b.item.name, b.start, b.end, `${b.index}/${b.count}`])).toEqual([
      ["Comida", 360, 720, "0/2"],
      ["Leitura", 360, 720, "1/2"],
      ["Estudo", 1080, 1440, "0/1"],
    ]);
  });

  it("steps a timed card in only when it happens during a band", () => {
    const bands = periodBands([part("Comida", "MORNING")]);
    expect(bandInset(bands, 600, 660)).toBe(BAND_INSET);
    expect(bandInset(bands, 720, 780)).toBe(0);
    expect(bandInset(bands, 300, 360)).toBe(0);
  });
});
