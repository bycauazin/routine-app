import { describe, expect, it } from "vitest";
import { formatMinute, formatRange, nowMinute, parseTime } from "./minutes";

describe("minutes", () => {
  it("formats minutes as HH:MM, midnight at the end as 00:00", () => {
    expect(formatMinute(420)).toBe("07:00");
    expect(formatMinute(1265)).toBe("21:05");
    expect(formatMinute(1440)).toBe("00:00");
    expect(formatMinute(null)).toBe("");
  });

  it("formats ranges", () => {
    expect(formatRange(420, 480)).toBe("07:00–08:00");
    expect(formatRange(600, null)).toBe("10:00");
    expect(formatRange(null, null)).toBe("");
  });

  it("reads time inputs; 00:00 as an end is the end of the day", () => {
    expect(parseTime("07:30")).toBe(450);
    expect(parseTime("")).toBeNull();
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("00:00", { end: true })).toBe(1440);
  });

  it("knows the current minute in São Paulo", () => {
    expect(nowMinute(undefined, new Date("2026-11-23T13:45:00Z"))).toBe(10 * 60 + 45); // 10:45 in UTC−3
  });
});
