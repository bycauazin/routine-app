import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addMonthsToYearMonth,
  civilDateToDb,
  dateInMonth,
  dbToCivilDate,
  daysInMonth,
  isCivilDate,
  todayIn,
} from "../../src/utils/dateUtils.js";

describe("addMonths", () => {
  it("clamps to the end of shorter months instead of adding 30 days", () => {
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-03-31", 1)).toBe("2025-04-30");
  });

  it("crosses year boundaries in both directions", () => {
    expect(addMonths("2025-11-10", 2)).toBe("2026-01-10");
    expect(addMonths("2025-12-15", 13)).toBe("2027-01-15");
    expect(addMonths("2026-01-10", -1)).toBe("2025-12-10");
  });
});

describe("misc civil date helpers", () => {
  it("knows month lengths, including leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it("clamps day-of-month for recurring due days", () => {
    expect(dateInMonth(2025, 2, 31)).toBe("2025-02-28");
    expect(dateInMonth(2025, 4, 31)).toBe("2025-04-30");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("shifts year-months", () => {
    expect(addMonthsToYearMonth("2025-12", 1)).toBe("2026-01");
    expect(addMonthsToYearMonth("2025-01", -1)).toBe("2024-12");
  });

  it("validates civil dates", () => {
    expect(isCivilDate("2025-02-29")).toBe(false);
    expect(isCivilDate("2024-02-29")).toBe(true);
    expect(isCivilDate("2025-13-01")).toBe(false);
    expect(isCivilDate("25-01-01")).toBe(false);
  });

  it("round-trips through the database representation", () => {
    expect(dbToCivilDate(civilDateToDb("2025-07-09"))).toBe("2025-07-09");
  });

  it("resolves 'today' in São Paulo, not UTC", () => {
    // 02:30 UTC on Jan 1st is still Dec 31st in São Paulo (UTC-3).
    const instant = new Date("2026-01-01T02:30:00Z");
    expect(todayIn("America/Sao_Paulo", instant)).toBe("2025-12-31");
    expect(todayIn("UTC", instant)).toBe("2026-01-01");
  });
});

describe("year-month helpers", async () => {
  const { isYearMonth, currentYearMonth, dueDateIn, monthRange, yearMonthToDb, dbToYearMonth } = await import("../../src/utils/dateUtils.js");

  it("validates months", () => {
    expect(isYearMonth("2026-11")).toBe(true);
    expect(isYearMonth("2026-13")).toBe(false);
    expect(isYearMonth("1999-12")).toBe(false);
    expect(isYearMonth("2026-1")).toBe(false);
  });

  it("resolves the current month in São Paulo", () => {
    expect(currentYearMonth("America/Sao_Paulo", new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
  });

  it("clamps due days to the month length", () => {
    expect(dueDateIn("2026-02", 31)).toBe("2026-02-28");
    expect(dueDateIn("2028-02", 30)).toBe("2028-02-29");
    expect(dueDateIn("2026-11", 10)).toBe("2026-11-10");
  });

  it("lists month ranges across years", () => {
    expect(monthRange("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("round-trips months through the database type", () => {
    expect(dbToYearMonth(yearMonthToDb("2027-01"))).toBe("2027-01");
  });
});
