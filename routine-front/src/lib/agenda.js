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
