/**
 * The routine's rules, as pure functions (no database, no clock): when a
 * fixed item happens, how a day is ordered and how much of it was done.
 * Every function here is covered by __tests__/unit/routine.test.js.
 *
 * @typedef {import("./dateUtils.js").CivilDate} CivilDate
 * @typedef {{ weekdays: number[], startDate: CivilDate, endDate: CivilDate | null }} RuleDays
 */

import { addDays, parseCivilDate } from "./dateUtils.js";

/** Last minute a block may start at, and the end-of-day value (1440 = midnight that ends the day). */
export const LAST_START_MINUTE = 1439;
export const END_OF_DAY = 1440;

/** Parts of the day for items without an exact time: [start, end) in minutes. */
export const PERIODS = Object.freeze({ MORNING: [360, 720], AFTERNOON: [720, 1080], EVENING: [1080, 1440] });

/** Most steps ("afazeres") a routine block may have. */
export const MAX_STEPS = 20;

/** 0 = Sunday … 6 = Saturday, the same numbering as `routine_rules.weekdays`. @param {CivilDate} date */
export function weekdayOf(date) {
  const { year, month, day } = parseCivilDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Weekdays sorted and without repeats (the shape stored in the database). @param {number[]} days */
export function normalizeWeekdays(days) {
  return [...new Set(days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
}

/** True when the rule makes an item on `date`. @param {RuleDays} rule @param {CivilDate} date */
export function occursOn(rule, date) {
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  return rule.weekdays.includes(weekdayOf(date));
}

/** Monday of the week of `date` (weeks run Monday to Sunday, like the spreadsheet). @param {CivilDate} date */
export function weekStart(date) {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/**
 * Office or home: the switch of that day when there is one ("Hoje é home"),
 * otherwise the default of its weekday.
 * @param {CivilDate} date @param {number[]} officeWeekdays @param {"OFFICE" | "HOME" | null} [override]
 */
export function dayMode(date, officeWeekdays, override = null) {
  if (override) return override;
  return officeWeekdays.includes(weekdayOf(date)) ? "OFFICE" : "HOME";
}

/**
 * Office weekdays in effect on `date`: the last change on or before it (none
 * before the first one). `officeDays` is oldest first.
 * @param {{ from: CivilDate, weekdays: number[] }[]} officeDays @param {CivilDate} date
 */
export function officeWeekdaysOn(officeDays, date) {
  let weekdays = [];
  for (const change of officeDays ?? []) if (change.from <= date) weekdays = change.weekdays;
  return weekdays;
}

/**
 * The office days after changing them from `from` on: later changes are
 * replaced and the days before keep theirs. No change is stored when the
 * weekdays are the same as before.
 * @param {{ from: CivilDate, weekdays: number[] }[]} officeDays @param {CivilDate} from @param {number[]} weekdays
 */
export function changeOfficeDays(officeDays, from, weekdays) {
  const kept = (officeDays ?? []).filter((change) => change.from < from);
  const before = kept.length ? kept[kept.length - 1].weekdays : [];
  return before.join() === weekdays.join() ? kept : [...kept, { from, weekdays }];
}

/** True when a rule of `ruleMode` happens on a day of `mode` (a rule without a mode happens every day). */
export function fitsMode(ruleMode, mode) {
  return !ruleMode || ruleMode === mode;
}

/** Every day from `from` to `to`, both included (empty when `to` is before `from`). */
export function datesBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Times of an item: both null (no time), or a start (0–1439) with an optional
 * end after it (up to 1440). Returns an error message, or null when valid.
 * Blocks that cross midnight are not supported in the first version.
 */
export function minutesError(startMinute, endMinute) {
  const none = startMinute === null || startMinute === undefined;
  if (none) return endMinute === null || endMinute === undefined ? null : "Informe o horário de início.";
  if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > LAST_START_MINUTE) return "Horário de início inválido.";
  if (endMinute === null || endMinute === undefined) return null;
  if (!Number.isInteger(endMinute) || endMinute > END_OF_DAY) return "Horário de fim inválido.";
  if (endMinute <= startMinute) return "O fim precisa ser depois do início (blocos que passam da meia-noite ainda não são aceitos).";
  return null;
}

/**
 * Exact times or a part of the day ("de manhã"), never both. Returns an error
 * message, or null when valid.
 */
export function timeError(startMinute, endMinute, period) {
  if (period && startMinute !== null && startMinute !== undefined) return "Escolha um horário ou um período, não os dois.";
  if (period && !PERIODS[period]) return "Período inválido.";
  return minutesError(startMinute, endMinute);
}

/** Where an item sits in the day: its start, or the start of its period; null = no time ("a qualquer hora"). */
export function sortMinute(item) {
  if (item.startMinute !== null && item.startMinute !== undefined) return item.startMinute;
  return item.period ? PERIODS[item.period][0] : null;
}

/**
 * Timeline order: by start (a period counts from its start and comes before
 * exact times there), then end (shorter first), then name. Items without a
 * time or period go to "a qualquer hora", in the order they were created.
 * @template {{ startMinute: number | null, endMinute: number | null, period?: string | null, name: string }} T
 * @param {T[]} items
 */
export function splitTimeline(items) {
  const timed = items
    .filter((i) => sortMinute(i) !== null)
    .sort(
      (a, b) =>
        sortMinute(a) - sortMinute(b) ||
        (a.period ? 0 : 1) - (b.period ? 0 : 1) ||
        (a.endMinute ?? sortMinute(a)) - (b.endMinute ?? sortMinute(b)) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  return { timed, anytime: items.filter((i) => sortMinute(i) === null) };
}

/**
 * How much of a day was done: done ÷ (expected − skipped). A routine block
 * with steps counts each step (3 of its 5 done = 3 done); when the block is
 * "não houve", all its steps are. "Não houve" does not count either way; a
 * day with nothing expected has no percentage (null), so a free weekend is
 * never a failure.
 * @param {{ status: "PENDING" | "DONE" | "SKIPPED", steps?: { doneAt: unknown }[] }[]} items
 */
export function dayProgress(items) {
  let total = 0;
  let done = 0;
  let skipped = 0;
  for (const item of items) {
    const steps = item.steps ?? [];
    const size = steps.length || 1;
    total += size;
    if (item.status === "SKIPPED") skipped += size;
    else if (steps.length) done += steps.filter((step) => step.doneAt).length;
    else if (item.status === "DONE") done += 1;
  }
  const expected = total - skipped;
  return { total, done, skipped, pending: expected - done, percent: expected === 0 ? null : Math.round((done / expected) * 100) };
}

/**
 * The steps of a rule as stored: names trimmed, empty ones dropped, each with
 * a key. A given key is kept (the step keeps its streak across versions); a
 * new or repeated one gets `newKey()`.
 * @param {{ key?: string, name: string }[]} steps @param {() => string} newKey
 */
export function normalizeSteps(steps, newKey) {
  const seen = new Set();
  const out = [];
  for (const step of steps ?? []) {
    const name = String(step.name ?? "").trim();
    if (!name) continue;
    const key = step.key && !seen.has(step.key) ? step.key : newKey();
    seen.add(key);
    out.push({ key, name, minute: Number.isInteger(step.minute) ? step.minute : null });
  }
  return out;
}

/** A block with steps is done when all of them are, and pending otherwise. @param {{ doneAt: unknown }[]} steps */
export function statusFromSteps(steps) {
  return steps.length > 0 && steps.every((step) => step.doneAt) ? "DONE" : "PENDING";
}

/**
 * Days in a row a step was done, up to `asOf` (current), and the longest run
 * (best). A past day it was not done breaks the run; "não houve" and days
 * without it do not. `asOf` itself only counts once done (the day is not over).
 * @param {{ date: CivilDate, done: boolean, skipped: boolean }[]} days
 * @param {CivilDate} asOf
 */
export function streak(days, asOf) {
  const sorted = days.filter((d) => d.date <= asOf && !d.skipped).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let run = 0;
  let best = 0;
  for (const day of sorted) {
    if (day.done) best = Math.max(best, ++run);
    else if (day.date !== asOf) run = 0;
  }
  return { current: run, best };
}

/**
 * Moves an item's times by `minutes` ("atrasar 30 min"), keeping its length.
 * Returns null when it would leave the day.
 */
export function shiftMinutes(startMinute, endMinute, minutes) {
  if (startMinute === null) return null;
  const start = startMinute + minutes;
  const end = endMinute === null ? null : endMinute + minutes;
  if (start < 0 || start > LAST_START_MINUTE || (end !== null && end > END_OF_DAY)) return null;
  return { startMinute: start, endMinute: end };
}
