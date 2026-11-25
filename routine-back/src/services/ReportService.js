import SpecialDayService from "./SpecialDayService.js";
import DayItemDao from "../daos/DayItemDao.js";
import RoutineRuleDao from "../daos/RoutineRuleDao.js";
import WaterLogDao from "../daos/WaterLogDao.js";
import { ValidationError } from "../shared/errors.js";
import { addDays, civilDateToDb, dbToCivilDate, todayIn } from "../utils/dateUtils.js";
import { activitySummary, delayMap, goalValue, goalWindow, waterSummary } from "../utils/reportUtils.js";
import { datesBetween, fitsMode, occursOn, streak, weekdayOf } from "../utils/routineUtils.js";
import DayService from "./DayService.js";
import GoalService from "./GoalService.js";
import WaterService from "./WaterService.js";

const civil = (date) => date && dbToCivilDate(date);
const inRange = (date, from, to) => date && date >= from && date <= to;

function range(query, today, pending = false) {
  const to = query.to ?? (pending ? addDays(today, -1) : today);
  const from = query.from ?? (pending ? addDays(to, -29) : to);
  if (from > to || to > addDays(from, 365)) {
    throw new ValidationError("Escolha um intervalo de até 366 dias, com início antes do fim.", { to: "Confira a data final." });
  }
  const limit = pending ? addDays(today, -1) : today;
  return { from, to: to < limit ? to : limit, requestedTo: to };
}

/**
 * Imprevistos of the period: how long they took, and the planned items they
 * took (still counted in the score, here with the reason).
 */
function unplannedSummary(items) {
  const unplanned = items.filter((item) => item.isUnplanned);
  const list = unplanned.map((u) => {
    const taken = items.filter((item) => item.displacedById === u.id);
    return {
      id: u.id,
      name: u.name,
      date: u.civilDate,
      startMinute: u.startMinute,
      endMinute: u.endMinute,
      minutes: Math.max(0, (u.endMinute ?? 0) - (u.startMinute ?? 0)),
      icon: u.icon ?? null,
      category: u.category ? { name: u.category.name, colorKey: u.category.colorKey, icon: u.category.icon } : null,
      taken: taken.map((item) => ({ name: item.name, status: item.status })),
    };
  });
  return {
    count: list.length,
    minutes: list.reduce((sum, u) => sum + u.minutes, 0),
    missed: list.reduce((sum, u) => sum + u.taken.filter((t) => t.status === "PENDING").length, 0),
    list: list.sort((a, b) => (a.date === b.date ? (a.startMinute ?? 0) - (b.startMinute ?? 0) : a.date < b.date ? 1 : -1)),
  };
}

class ReportService {
  async report(userId, query) {
    const today = todayIn();
    const { from, to, requestedTo } = range(query, today);
    const goals = await GoalService.list(userId);
    const periods = new Set(goals.map((goal) => goal.period));
    const dataFrom = [...periods].reduce((first, period) => {
      const start = goalWindow(from, period).from;
      return start < first ? start : first;
    }, from);
    const dataTo = [...periods].reduce((last, period) => {
      const end = goalWindow(to, period).to;
      return end > last ? end : last;
    }, to);
    const through = dataTo < today ? dataTo : today;
    const empty = from > to;
    if (!empty) await DayService.materialize(userId, dataFrom, through);
    const [items, waterRows, firstWater, goalMl, moved] = await Promise.all([
      empty ? [] : DayItemDao.between(userId, dataFrom, through),
      empty ? [] : WaterLogDao.totalsBetween(userId, dataFrom, through),
      WaterLogDao.findAllOwned(userId, { select: { date: true }, orderBy: { date: "asc" }, take: 1 }),
      WaterService.goal(userId),
      empty ? [] : DayItemDao.findAllOwned(userId, {
        where: { scheduledDate: { gte: civilDateToDb(from), lte: civilDateToDb(to) } },
        select: { id: true, date: true, startMinute: true, scheduledDate: true, scheduledMinute: true, status: true, doneMinute: true },
      }),
    ]);
    const rows = items.map((item) => ({ ...item, civilDate: civil(item.date) }));
    const all = rows.filter((item) => inRange(item.civilDate, from, to));
    const selected = all.filter((item) => !item.isUnplanned);
    const delays = new Map([...moved.map((item) => ({ ...item, civilDate: civil(item.date) })), ...selected].map((item) => [item.id, item]));
    const water = new Map(waterRows.map((row) => [civil(row.date), row._sum.amountMl ?? 0]));
    const dateKeys = datesBetween(from, to);
    return {
      from, to: requestedTo, through: empty ? null : to, today,
      ...activitySummary(selected, from, to),
      water: waterSummary(water, firstWater[0] ? civil(firstWater[0].date) : null, from, to, goalMl),
      delays: delayMap(delays.values(), from, to, today),
      streaks: await this.streaks(userId, selected, from, to, today),
      special: await this.specialAttention(userId, selected, from, to, today),
      unplanned: unplannedSummary(all),
      goals: goals.map((goal) => {
        const windows = new Map();
        for (const date of dateKeys) {
          const window = goalWindow(date, goal.period);
          windows.set(window.from, window);
        }
        const results = [...windows.values()].map(({ from, to }) => {
          const end = to > today ? today : to;
          const windowRows = rows.filter((item) => inRange(item.civilDate, from, end));
          const totalMl = goal.subject === "WATER" ? datesBetween(from, end).reduce((sum, day) => sum + (water.get(day) ?? 0), 0) : 0;
          const value = goalValue(goal, windowRows, totalMl);
          return { from, to, value, reached: value !== null && value >= goal.amount, open: to >= today };
        });
        return { ...goal, results };
      }),
    };
  }

  /**
   * Fins de semana and dias especiais in the period (up to yesterday): the
   * fixed items still planned on them (Rotina diária, Rotina de dormir…) and
   * how many were left undone. This is the "ponto de atenção".
   */
  async specialAttention(userId, items, from, to, today) {
    const end = to < today ? to : addDays(today, -1);
    if (end < from) return { weekends: 0, days: 0, missed: [] };
    const special = await SpecialDayService.map(userId, from, end);
    const weekend = (date) => [0, 6].includes(weekdayOf(date));
    const dates = datesBetween(from, end);
    const byName = new Map();
    for (const item of items) {
      const date = item.civilDate;
      if (!item.ruleId || date > end || item.status === "SKIPPED" || (!weekend(date) && !special.has(date))) continue;
      const row = byName.get(item.name) ?? { name: item.name, planned: 0, count: 0 };
      row.planned += 1;
      if (item.status === "PENDING") row.count += 1;
      byName.set(item.name, row);
    }
    return {
      weekends: dates.filter(weekend).length,
      days: dates.filter((d) => special.has(d) && !weekend(d)).length,
      missed: [...byName.values()].filter((r) => r.count > 0).sort((a, b) => b.count - a.count),
    };
  }

  async streaks(userId, items, from, to, today) {
    const names = new Map(items.flatMap((item) => item.steps.map((step) => [step.stepKey, { name: step.name, itemName: item.name }])));
    if (!names.size) return [];
    const [history, allRules] = await Promise.all([
      DayItemDao.stepHistory(userId, [...names.keys()], to),
      RoutineRuleDao.findAllOwned(userId, {
        where: { startDate: { lte: civilDateToDb(to) } },
        select: { id: true, startDate: true, endDate: true, weekdays: true, mode: true, steps: true },
        orderBy: { startDate: "asc" },
      }),
    ]);
    const byKey = Map.groupBy(history, (step) => step.stepKey);
    const rules = allRules.map((rule) => ({ ...rule, startDate: civil(rule.startDate), endDate: civil(rule.endDate), keys: rule.steps.map((step) => step.key).filter((key) => names.has(key)) })).filter((rule) => rule.keys.length);
    const missingByKey = await this.unopenedStepDates(userId, rules, to);
    return [...names].map(([key, labels]) => {
      const byDate = Map.groupBy(byKey.get(key) ?? [], (step) => civil(step.dayItem.date));
      const days = [...byDate].map(([date, entries]) => ({
        date,
        done: entries.some((step) => step.doneAt && step.dayItem.status !== "SKIPPED"),
        skipped: entries.every((step) => step.dayItem.status === "SKIPPED"),
      }));
      for (const date of missingByKey.get(key) ?? []) {
        if (!byDate.has(date)) days.push({ date, done: false, skipped: false });
      }
      const selected = days.filter((day) => day.date >= from && !day.skipped);
      const percent = selected.length ? Math.round(selected.filter((day) => day.done).length / selected.length * 100) : null;
      return { key, ...labels, ...streak(days, to < today ? addDays(to, 1) : to), percent };
    }).sort((a, b) => b.current - a.current || b.best - a.best || a.name.localeCompare(b.name, "pt-BR"));
  }

  /** Infer missed occurrences for streaks without inserting years of unopened days. */
  async unopenedStepDates(userId, rules, to) {
    if (!rules.length) return new Map();
    const [rows, modes] = await Promise.all([
      DayItemDao.findAllOwned(userId, {
        where: { ruleId: { in: rules.map((rule) => rule.id) }, originDate: { lte: civilDateToDb(to) } },
        select: { ruleId: true, originDate: true },
      }),
      rules.some((rule) => rule.mode) ? DayService.modeMap(userId, rules[0].startDate, to) : null,
    ]);
    const materialized = new Set(rows.map((row) => `${row.ruleId}/${civil(row.originDate)}`));
    const result = new Map();
    for (const rule of rules) {
      const last = rule.endDate && rule.endDate < to ? rule.endDate : to;
      for (const date of datesBetween(rule.startDate, last)) {
        if (!occursOn(rule, date) || !fitsMode(rule.mode, modes?.get(date)?.value) || materialized.has(`${rule.id}/${date}`)) continue;
        for (const key of rule.keys) {
          if (!result.has(key)) result.set(key, new Set());
          result.get(key).add(date);
        }
      }
    }
    return result;
  }

  async pending(userId, query) {
    const today = todayIn();
    const { from, to, requestedTo } = range(query, today, true);
    if (from > to) return { from, to: requestedTo, today, days: [] };
    await DayService.materialize(userId, from, to);
    const items = await DayItemDao.findAllOwned(userId, {
      where: { date: { gte: civilDateToDb(from), lte: civilDateToDb(to) }, status: "PENDING", reviewedAt: null },
      select: { id: true, name: true, date: true, startMinute: true, steps: { select: { doneAt: true } }, category: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { startMinute: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    });
    const days = [...Map.groupBy(items, (item) => civil(item.date))].map(([date, list]) => ({
      date,
      items: list.map(({ id, name, startMinute, steps, category }) => ({ id, name, startMinute, category: category?.name ?? null, steps: steps.length, stepsDone: steps.filter((step) => step.doneAt).length })),
    }));
    return { from, to: requestedTo, today, days };
  }
}

export default new ReportService();
