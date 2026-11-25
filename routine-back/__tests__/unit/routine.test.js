import { describe, expect, it } from "vitest";
import { changeOfficeDays, datesBetween, dayMode, officeWeekdaysOn, dayProgress, fitsMode, minutesError, normalizeSteps, normalizeWeekdays, occursOn, shiftMinutes, sortMinute, splitTimeline, statusFromSteps, streak, timeError, weekStart, weekdayOf } from "../../src/utils/routineUtils.js";

describe("weekdays", () => {
  it("numbers days 0 = Sunday … 6 = Saturday", () => {
    expect(weekdayOf("2026-11-22")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-23")).toBe(1);
    expect(weekdayOf("2026-11-28")).toBe(6);
    expect(weekdayOf("2028-02-29")).toBe(2);
  });

  it("normalizes: sorted, no repeats, only 0–6", () => {
    expect(normalizeWeekdays([5, 1, 3, 1, 9, -1, 2.5])).toEqual([1, 3, 5]);
  });
});

describe("occursOn", () => {
  const rule = { weekdays: [1, 3, 5], startDate: "2026-11-23", endDate: null };

  it("happens on the chosen weekdays from the start date on", () => {
    expect(occursOn(rule, "2026-11-23")).toBe(true); // Monday
    expect(occursOn(rule, "2026-11-24")).toBe(false); // Tuesday
    expect(occursOn(rule, "2026-11-25")).toBe(true);
    expect(occursOn(rule, "2026-11-16")).toBe(false); // Monday before the start
  });

  it("stops after the end date (inclusive)", () => {
    const closed = { ...rule, endDate: "2026-11-25" };
    expect(occursOn(closed, "2026-11-25")).toBe(true);
    expect(occursOn(closed, "2026-11-27")).toBe(false);
  });
});

describe("datesBetween", () => {
  it("lists every day, both ends included, across months", () => {
    expect(datesBetween("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(datesBetween("2026-12-02", "2026-12-01")).toEqual([]);
  });
});

describe("minutesError", () => {
  it.each([
    [null, null, null],
    [420, 480, null],
    [1380, 1440, null], // 23:00 to midnight
    [600, null, null], // start only
    [null, 480, "Informe o horário de início."],
    [-1, 60, "Horário de início inválido."],
    [1440, null, "Horário de início inválido."],
    [480, 480, "O fim precisa ser depois do início (blocos que passam da meia-noite ainda não são aceitos)."],
    [1380, 60, "O fim precisa ser depois do início (blocos que passam da meia-noite ainda não são aceitos)."],
    [600, 1441, "Horário de fim inválido."],
  ])("%s → %s", (start, end, expected) => {
    expect(minutesError(start, end)).toBe(expected);
  });
});

describe("splitTimeline", () => {
  it("orders by start, then end, then name; untimed items go to 'a qualquer hora'", () => {
    const items = [
      { name: "Trabalho", startMinute: 540, endMinute: 780 },
      { name: "Ligar pro banco", startMinute: null, endMinute: null },
      { name: "Acordar", startMinute: 420, endMinute: 480 },
      { name: "Reunião", startMinute: 540, endMinute: 600 },
      { name: "Almoço", startMinute: 540, endMinute: 600 },
    ];
    const { timed, anytime } = splitTimeline(items);
    expect(timed.map((i) => i.name)).toEqual(["Acordar", "Almoço", "Reunião", "Trabalho"]);
    expect(anytime.map((i) => i.name)).toEqual(["Ligar pro banco"]);
  });
});

describe("dayProgress", () => {
  it("is done ÷ (items − não houve)", () => {
    const p = dayProgress([{ status: "DONE" }, { status: "DONE" }, { status: "PENDING" }, { status: "SKIPPED" }]);
    expect(p).toEqual({ total: 4, done: 2, skipped: 1, pending: 1, percent: 67 });
  });

  it("has no percentage when nothing was expected (free day, or everything skipped)", () => {
    expect(dayProgress([]).percent).toBeNull();
    expect(dayProgress([{ status: "SKIPPED" }]).percent).toBeNull();
  });
});

describe("shiftMinutes", () => {
  it("moves start and end together", () => {
    expect(shiftMinutes(1080, 1140, 30)).toEqual({ startMinute: 1110, endMinute: 1170 });
    expect(shiftMinutes(600, null, 15)).toEqual({ startMinute: 615, endMinute: null });
  });

  it("refuses to leave the day, and items without time", () => {
    expect(shiftMinutes(1380, 1440, 30)).toBeNull();
    expect(shiftMinutes(null, null, 30)).toBeNull();
  });
});

describe("stage 3: periods, office/home, steps and streaks", () => {
  it("weeks run Monday to Sunday", () => {
    expect(weekStart("2026-11-23")).toBe("2026-11-23"); // Monday
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // Sunday
    expect(weekStart("2026-12-02")).toBe("2026-11-30");
  });

  it("a day is office or home: its own switch first, else its weekday", () => {
    expect(dayMode("2026-11-24", [2, 4])).toBe("OFFICE"); // Tuesday
    expect(dayMode("2026-11-23", [2, 4])).toBe("HOME");
    expect(dayMode("2026-11-24", [2, 4], "HOME")).toBe("HOME");
    expect(fitsMode(null, "HOME")).toBe(true);
    expect(fitsMode("OFFICE", "HOME")).toBe(false);
    expect(fitsMode("HOME", "HOME")).toBe(true);
  });

  it("office days change from a day on; the days before keep theirs", () => {
    const days = changeOfficeDays(changeOfficeDays([], "2026-11-01", [2, 4]), "2026-11-24", [1, 3]);
    expect(days).toEqual([{ from: "2026-11-01", weekdays: [2, 4] }, { from: "2026-11-24", weekdays: [1, 3] }]);
    expect(officeWeekdaysOn(days, "2026-10-31")).toEqual([]);
    expect(officeWeekdaysOn(days, "2026-11-23")).toEqual([2, 4]);
    expect(officeWeekdaysOn(days, "2026-11-24")).toEqual([1, 3]);
    // Changing again on the same day replaces it; going back to what it was stores nothing new.
    expect(changeOfficeDays(days, "2026-11-24", [5])).toEqual([{ from: "2026-11-01", weekdays: [2, 4] }, { from: "2026-11-24", weekdays: [5] }]);
    expect(changeOfficeDays(days, "2026-11-24", [2, 4])).toEqual([{ from: "2026-11-01", weekdays: [2, 4] }]);
  });

  it("an item has exact times or a period, never both", () => {
    expect(timeError(null, null, "MORNING")).toBeNull();
    expect(timeError(600, 660, null)).toBeNull();
    expect(timeError(600, null, "MORNING")).toBe("Escolha um horário ou um período, não os dois.");
    expect(timeError(null, null, "NIGHT")).toBe("Período inválido.");
  });

  it("periods sit at their start in the timeline, before exact times there", () => {
    const { timed, anytime } = splitTimeline([
      { name: "Almoço", startMinute: 720, endMinute: 780, period: null },
      { name: "Fazer comida", startMinute: null, endMinute: null, period: "AFTERNOON" },
      { name: "Acordar", startMinute: 420, endMinute: 450, period: null },
      { name: "Ler", startMinute: null, endMinute: null, period: null },
    ]);
    expect(timed.map((i) => i.name)).toEqual(["Acordar", "Fazer comida", "Almoço"]);
    expect(anytime.map((i) => i.name)).toEqual(["Ler"]);
    expect(sortMinute({ startMinute: null, period: "EVENING" })).toBe(1080);
  });

  it("counts each step of a routine block; a skipped block skips all its steps", () => {
    const block = (status, done, total) => ({ status, steps: Array.from({ length: total }, (_, i) => ({ doneAt: i < done ? new Date() : null })) });
    expect(dayProgress([block("PENDING", 3, 5), { status: "DONE" }])).toEqual({ total: 6, done: 4, skipped: 0, pending: 2, percent: 67 });
    expect(dayProgress([block("SKIPPED", 1, 4), { status: "PENDING" }])).toEqual({ total: 5, done: 0, skipped: 4, pending: 1, percent: 0 });
  });

  it("steps keep their keys, get new ones when missing or repeated, and drop empty names", () => {
    let n = 0;
    const newKey = () => `new-${++n}`;
    expect(normalizeSteps([{ key: "a", name: " Ler " }, { name: "" }, { key: "a", name: "Banho" }, { name: "Duolingo" }], newKey)).toEqual([
      { key: "a", name: "Ler", minute: null },
      { key: "new-1", name: "Banho", minute: null },
      { key: "new-2", name: "Duolingo", minute: null },
    ]);
    expect(statusFromSteps([{ doneAt: 1 }, { doneAt: 1 }])).toBe("DONE");
    expect(statusFromSteps([{ doneAt: 1 }, { doneAt: null }])).toBe("PENDING");
    expect(statusFromSteps([])).toBe("PENDING");
  });

  it("a streak counts days in a row; 'não houve' does not break it, today counts once done", () => {
    const day = (date, done, skipped = false) => ({ date, done, skipped });
    const days = [day("2026-11-18", true), day("2026-11-19", false), day("2026-11-20", true), day("2026-11-21", true), day("2026-11-22", false, true), day("2026-11-23", true), day("2026-11-24", false)];
    expect(streak(days, "2026-11-24")).toEqual({ current: 3, best: 3 }); // today still open
    expect(streak([...days.slice(0, 6), day("2026-11-24", true)], "2026-11-24")).toEqual({ current: 4, best: 4 });
    expect(streak(days, "2026-11-25")).toEqual({ current: 0, best: 3 }); // yesterday was missed
    expect(streak([], "2026-11-24")).toEqual({ current: 0, best: 0 });
  });
});
