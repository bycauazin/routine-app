/** Weekdays as the API stores them: 0 = Sunday … 6 = Saturday. Shown Monday first. */

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Quick choices in the form. */
export const WEEKDAY_PRESETS = [
  { label: "Seg a sex", days: [1, 2, 3, 4, 5] },
  { label: "Todo dia", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Fim de semana", days: [0, 6] },
];

const same = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

/** [1,2,3,4,5] → "seg a sex"; all → "todo dia"; [0,6] → "fim de semana"; [1,3,5] → "seg, qua e sex". */
export function weekdaysLabel(days) {
  const sorted = WEEKDAY_ORDER.filter((d) => days.includes(d));
  if (sorted.length === 0) return "";
  if (sorted.length === 7) return "todo dia";
  if (same(sorted, [0, 6])) return "fim de semana";
  // A run of 3+ days in a row (Monday-first order): "seg a sex", "qua a dom".
  const positions = sorted.map((d) => WEEKDAY_ORDER.indexOf(d));
  const consecutive = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (consecutive && sorted.length >= 3) return `${WEEKDAY_SHORT[sorted[0]]} a ${WEEKDAY_SHORT[sorted[sorted.length - 1]]}`;
  const names = sorted.map((d) => WEEKDAY_SHORT[d]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
