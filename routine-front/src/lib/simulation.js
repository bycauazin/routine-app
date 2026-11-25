/**
 * Pure helpers of Simulações: blocks are { key, name, categoryId, weekdays,
 * startMinute, endMinute, period, steps, insideKeys } (see SimulationService).
 */

export const newKey = () => crypto.randomUUID();
const SNAP = 15;
export const snap = (minute) => Math.max(0, Math.min(1440 - SNAP, Math.round(minute / SNAP) * SNAP));

/** Length of a timed block in minutes (no end = 30 min, like the agenda). */
export const lengthOf = (b) => (b.startMinute === null ? 0 : Math.max(SNAP, (b.endMinute ?? b.startMinute + 30) - b.startMinute));

/**
 * Moves the block shown on `fromDay` to `toDay` at `startMinute`, keeping its
 * length. A block on several weekdays is split: only that day moves.
 */
export function moveBlock(blocks, key, fromDay, toDay, startMinute) {
  const block = blocks.find((b) => b.key === key);
  if (!block) return blocks;
  const length = lengthOf(block);
  const start = snap(Math.min(startMinute, 1440 - length));
  const moved = { startMinute: start, endMinute: Math.min(1440, start + length), period: null };
  if (block.weekdays.length === 1) return blocks.map((b) => (b.key === key ? { ...b, ...moved, weekdays: [toDay] } : b));
  return [
    ...blocks.map((b) => (b.key === key ? { ...b, weekdays: b.weekdays.filter((d) => d !== fromDay) } : b)),
    { ...block, ...moved, key: newKey(), weekdays: [toDay], insideKeys: [...(block.insideKeys ?? [])] },
  ];
}

/** Takes one weekday out of a block (the block goes away with its last day). */
export function removeDay(blocks, key, day) {
  return blocks
    .map((b) => (b.key === key ? { ...b, weekdays: b.weekdays.filter((d) => d !== day) } : b))
    .filter((b) => b.weekdays.length > 0);
}

/** Hours per week by category id ("none" = no category), timed blocks only. */
export function hoursByCategory(blocks) {
  const out = {};
  for (const b of blocks) {
    if (b.startMinute === null) continue;
    const k = b.categoryId ?? "none";
    out[k] = (out[k] ?? 0) + (lengthOf(b) * b.weekdays.length) / 60;
  }
  return out;
}

/** Pairs of blocks that overlap on the same weekday: [{ day, a, b }] (names). */
export function overlaps(blocks) {
  const out = [];
  for (let day = 0; day < 7; day++) {
    const list = blocks.filter((b) => b.startMinute !== null && b.weekdays.includes(day)).sort((x, y) => x.startMinute - y.startMinute);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].startMinute < list[i].startMinute + lengthOf(list[i])) out.push({ day, a: list[i].name, b: list[j].name });
      }
    }
  }
  return out;
}
