import { addDays, addMonths, dbToCivilDate } from "./dateUtils.js";
import { datesBetween, dayProgress, weekStart } from "./routineUtils.js";

export const GOAL_UNITS = {
  ROUTINE: ["PERCENT", "COUNT", "MINUTES"],
  WATER: ["ML"],
  WORKOUT: ["COUNT", "MINUTES", "PERCENT"],
  CATEGORY: ["COUNT", "MINUTES", "PERCENT"],
  ITEM: ["COUNT", "MINUTES", "PERCENT"],
  STEP: ["COUNT", "PERCENT"],
};

export function goalWindow(date, period) {
  if (period === "WEEK") {
    const from = weekStart(date);
    return { from, to: addDays(from, 6) };
  }
  if (period === "MONTH") {
    const from = date.slice(0, 7) + "-01";
    return { from, to: addDays(addMonths(from, 1), -1) };
  }
  return { from: date, to: date };
}

export const duration = (item) => item.startMinute != null && item.endMinute != null ? item.endMinute - item.startMinute : 0;
export const isWorkout = (item) => item.kind === "WORKOUT" || item.category?.colorKey === "workout";

function score(items) {
  let expected = 0;
  let done = 0;
  for (const item of items) {
    const weight = item.steps.length || item.kind === "APPOINTMENT" ? 2 : 1;
    const progress = dayProgress([item]);
    expected += (progress.total - progress.skipped) * weight;
    done += progress.done * weight;
  }
  return expected ? Math.round(done / expected * 100) / 10 : null;
}

export function activitySummary(items, from, to) {
  const byDate = Map.groupBy(items, (item) => item.civilDate);
  const completed = items.filter((item) => item.status === "DONE");
  const categories = Map.groupBy(items, (item) => item.category?.id ?? null);
  const workouts = Map.groupBy(completed.filter(isWorkout), (item) => item.variant ?? item.name);
  return {
    progress: dayProgress(items),
    score: score(items),
    days: datesBetween(from, to).map((date) => {
      const rows = byDate.get(date) ?? [];
      return { date, ...dayProgress(rows), score: score(rows) };
    }),
    categories: [...categories].map(([key, rows]) => ({
      key: key ?? "uncategorized",
      name: rows[0].category?.name ?? "Sem categoria",
      colorKey: rows[0].category?.colorKey ?? null,
      icon: rows[0].category?.icon ?? null,
      minutes: rows.filter((item) => item.status === "DONE").reduce((sum, item) => sum + duration(item), 0),
      percent: dayProgress(rows).percent,
    })).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "pt-BR")),
    workouts: [...workouts].map(([name, rows]) => ({ name, count: rows.length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")),
  };
}

export function waterSummary(waterByDate, first, from, to, goalMl) {
  const days = first ? datesBetween(first > from ? first : from, to).map((date) => ({ date, amountMl: waterByDate.get(date) ?? 0 })) : [];
  const totalMl = days.reduce((sum, day) => sum + day.amountMl, 0);
  return { totalMl, goalMl, averageMl: days.length ? Math.round(totalMl / days.length) : null, reached: days.filter((day) => day.amountMl >= goalMl).length, days: days.length, daily: days.map(({ date, amountMl }) => ({ date, amountMl })) };
}

export function goalValue(goal, items, water) {
  if (goal.subject === "WATER") return water;
  if (goal.subject === "STEP") {
    const steps = items.filter((item) => item.status !== "SKIPPED").flatMap((item) => item.steps).filter((step) => step.stepKey === goal.targetKey);
    const done = steps.filter((step) => step.doneAt).length;
    return goal.unit === "COUNT" ? done : steps.length ? Math.round(done / steps.length * 100) : null;
  }
  const rows = items.filter((item) => {
    if (goal.subject === "WORKOUT") return isWorkout(item);
    if (goal.subject === "CATEGORY") return item.categoryId === goal.targetKey;
    if (goal.subject === "ITEM") return (item.seriesId ?? item.id) === goal.targetKey;
    return true;
  });
  if (goal.unit === "PERCENT") return dayProgress(rows).percent;
  const done = rows.filter((item) => item.status === "DONE");
  return goal.unit === "MINUTES" ? done.reduce((sum, item) => sum + duration(item), 0) : done.length;
}

/** Each cell counts distinct items. Breakdowns can overlap on the same item. */
export function delayMap(rows, from, to, today) {
  const cells = new Map();
  const totals = { missed: 0, late: 0, moved: 0 };
  function add(item, date, minute, type) {
    if (!date || date < from || date > to) return;
    totals[type]++;
    if (minute == null) return;
    const weekday = new Date(date + "T12:00:00Z").getUTCDay();
    const hour = Math.floor(minute / 60);
    const key = weekday * 24 + hour;
    if (!cells.has(key)) cells.set(key, { weekday, hour, missed: 0, late: 0, moved: 0, ids: new Set() });
    const cell = cells.get(key);
    cell[type]++;
    cell.ids.add(item.id);
  }
  for (const item of rows) {
    if (item.status === "SKIPPED") continue;
    const date = item.civilDate;
    if (date && date < today && item.status === "PENDING") add(item, date, item.startMinute, "missed");
    if (item.status === "DONE" && item.startMinute != null && item.doneMinute > item.startMinute) add(item, date, item.startMinute, "late");
    const scheduled = item.scheduledDate && dbToCivilDate(item.scheduledDate);
    if (scheduled && (scheduled !== date || item.scheduledMinute !== item.startMinute)) add(item, scheduled, item.scheduledMinute, "moved");
  }
  return { totals, cells: [...cells.values()].map(({ ids, ...cell }) => ({ ...cell, count: ids.size })) };
}
