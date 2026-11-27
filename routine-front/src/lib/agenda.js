import { PERIODS } from "./minutes";

/**
 * Places the timed items of one day of the week grid like a calendar: each
 * card from its start to its end, and items at the same time side by side
 * (sharing the width) instead of one over the other. Only layout: the times
 * come from the API.
 */

/** Shortest card drawn, in minutes, so an item without an end (or a short one) can still be read. */
export const MIN_CARD_MINUTES = 30;

/**
 * @template {{ startMinute: number | null, endMinute: number | null }} T
 * @param {T[]} items
 * @returns {{ item: T, start: number, end: number, column: number, columns: number }[]}
 */
export function layoutDay(items, minLength = MIN_CARD_MINUTES) {
  const events = items
    .filter((item) => item.startMinute !== null && item.startMinute !== undefined)
    .map((item) => ({ item, start: item.startMinute, end: Math.min(1440, Math.max(item.endMinute ?? 0, item.startMinute + minLength)) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const placed = [];
  let group = [];
  let groupEnd = -1;
  // A group = items linked by overlaps; all of them share the same number of columns.
  const close = () => {
    const columnEnds = [];
    for (const event of group) {
      let column = columnEnds.findIndex((end) => end <= event.start);
      if (column === -1) column = columnEnds.push(event.end) - 1;
      else columnEnds[column] = event.end;
      event.column = column;
    }
    for (const event of group) placed.push({ ...event, columns: columnEnds.length });
    group = [];
    groupEnd = -1;
  };
  for (const event of events) {
    if (group.length && event.start >= groupEnd) close();
    group.push(event);
    groupEnd = Math.max(groupEnd, event.end);
  }
  if (group.length) close();
  return placed;
}

/** px the timed cards step in from the left over a band, so its edge stays in sight. */
export const BAND_INSET = 12;

/**
 * Items for a part of the day ("de manhã") as bands on the week grid: the
 * whole period tall (Manhã 06–12, Tarde 12–18, Noite 18–24). Two items in the
 * same period share its width.
 */
export function periodBands(items) {
  const byPeriod = new Map();
  for (const item of items) {
    if (!item.period || !PERIODS[item.period]) continue;
    if (!byPeriod.has(item.period)) byPeriod.set(item.period, []);
    byPeriod.get(item.period).push(item);
  }
  return [...byPeriod].flatMap(([period, list]) =>
    list.map((item, index) => ({ item, start: PERIODS[period].start, end: PERIODS[period].end, index, count: list.length })),
  );
}

/** Left inset for a timed card: BAND_INSET when it happens during a band. */
export const bandInset = (bands, start, end) => (bands.some((b) => start < b.end && end > b.start) ? BAND_INSET : 0);

/**
 * The hours a set of items uses on the grid (whole hours), for "Enquadrar":
 * timed items from their start to their end (MIN_CARD_MINUTES when shorter or
 * without an end), parts of the day their whole period. null when nothing has a time.
 */
export function gridRange(items) {
  let start = Infinity;
  let end = -Infinity;
  for (const item of items) {
    const period = item.period && PERIODS[item.period];
    const from = item.startMinute ?? period?.start;
    if (from === undefined || from === null) continue;
    const to = item.startMinute !== null && item.startMinute !== undefined ? Math.max(item.endMinute ?? 0, from + MIN_CARD_MINUTES) : period.end;
    start = Math.min(start, from);
    end = Math.max(end, Math.min(1440, to));
  }
  if (start === Infinity) return null;
  return { start: Math.floor(start / 60) * 60, end: Math.min(1440, Math.ceil(end / 60) * 60) };
}

/** "5,8 h" */
export const formatHours = (hours) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(hours)} h`;

/** Px a card needs for one line of text; at a small zoom short items get at least that (side by side, not on top). */
const MIN_CARD_PX = 22;
export const minCardMinutes = (hourPx) => Math.max(MIN_CARD_MINUTES, Math.ceil((MIN_CARD_PX / hourPx) * 60));

/**
 * Hours per category in a week of the Semana tab, timed items only:
 * { [categoryId | "none"]: { planned, done } }. "Done" counts items marked done.
 */
export function weekHours(days) {
  const out = {};
  for (const day of days) {
    for (const item of day.items) {
      if (item.startMinute === null || item.startMinute === undefined || item.endMinute === null || item.endMinute === undefined) continue;
      const hours = Math.max(0, item.endMinute - item.startMinute) / 60;
      const key = item.category?.id ?? "none";
      out[key] ??= { planned: 0, done: 0 };
      out[key].planned += hours;
      if (item.status === "DONE") out[key].done += hours;
    }
  }
  return out;
}
