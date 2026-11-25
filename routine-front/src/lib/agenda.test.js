import { describe, expect, it } from "vitest";
import { layoutDay } from "./agenda";

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
