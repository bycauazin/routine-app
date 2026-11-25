import { describe, expect, it } from "vitest";
import { formatWeekRange, monthStartForRange, shiftDate, weekStart } from "./dates";

describe("week dates", () => {
  it("weeks start on Monday", () => {
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // Sunday
    expect(weekStart("2026-12-02")).toBe("2026-11-30");
    expect(shiftDate("2026-11-30", 1)).toBe("2026-12-01");
  });

  it("names the range of a week", () => {
    expect(formatWeekRange("2026-11-23", "2026-11-29")).toBe("23 a 29 de novembro");
    expect(formatWeekRange("2026-11-30", "2026-12-06")).toBe("30 de novembro a 6 de dezembro");
    expect(formatWeekRange("2026-12-28", "2027-01-03")).toBe("28 de dezembro de 2026 a 3 de janeiro de 2027");
  });

  it("uses a rolling calendar month even across a short month or a year boundary", () => {
    expect(monthStartForRange("2026-03-31")).toBe("2026-03-01");
    expect(monthStartForRange("2024-03-30")).toBe("2024-03-01");
    expect(monthStartForRange("2026-01-09")).toBe("2025-12-10");
  });
});
