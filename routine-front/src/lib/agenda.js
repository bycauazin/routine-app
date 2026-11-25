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
