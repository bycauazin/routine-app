import { describe, expect, it } from "vitest";
import { hoursByCategory, moveBlock, overlaps, removeDay } from "./simulation";

const work = { key: "w", name: "Trabalho", categoryId: "c1", weekdays: [1, 2, 3], startMinute: 540, endMinute: 720, period: null, insideKeys: [] };
const gym = { key: "g", name: "Academia", categoryId: null, weekdays: [1], startMinute: 700, endMinute: 760, period: null };

describe("simulation helpers", () => {
  it("moves a one-day block in place and splits a block of several days", () => {
    expect(moveBlock([gym], "g", 1, 2, 1083)).toEqual([{ ...gym, weekdays: [2], startMinute: 1080, endMinute: 1140 }]);
    const moved = moveBlock([work], "w", 2, 4, 600);
    expect(moved[0].weekdays).toEqual([1, 3]);
    expect(moved[1]).toMatchObject({ name: "Trabalho", weekdays: [4], startMinute: 600, endMinute: 780 });
    expect(moved[1].key).not.toBe("w");
  });

  it("removes one day and drops a block without days", () => {
    expect(removeDay([work], "w", 2)[0].weekdays).toEqual([1, 3]);
    expect(removeDay([gym], "g", 1)).toEqual([]);
  });

  it("adds hours per category and finds overlaps on the same day", () => {
    expect(hoursByCategory([work, gym])).toEqual({ c1: 9, none: 1 });
    expect(overlaps([work, gym])).toEqual([{ day: 1, a: "Trabalho", b: "Academia" }]);
  });
});
