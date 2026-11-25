import { randomUUID } from "node:crypto";
import DayItemDao, { UNTOUCHED } from "../daos/DayItemDao.js";
import DayModeDao from "../daos/DayModeDao.js";
import RoutineRuleDao from "../daos/RoutineRuleDao.js";
import UserSettingsDao from "../daos/UserSettingsDao.js";
import { withTransaction } from "../database/transaction.js";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors.js";
import { addDays, civilDateToDb, dbToCivilDate, minuteOfDayIn, todayIn } from "../utils/dateUtils.js";
import {
  datesBetween,
  dayMode,
  dayProgress,
  fitsMode,
  occursOn,
  officeWeekdaysOn,
  shiftMinutes,
  splitTimeline,
  statusFromSteps,
  streak,
  timeError,
  weekStart,
} from "../utils/routineUtils.js";
import CategoryService from "./CategoryService.js";
import WaterService from "./WaterService.js";

const notWorkout = "Só treinos têm tipo de treino.";

/**
 * The day and the week: items are made from the rules the first time a day
 * is opened (idempotent, no cron), only the rules that fit the day (office or
 * home), plus the one-off items. See docs/ARCHITECTURE.md → "Modelo (etapa 2)"
 * and "Modelo (etapa 3)".
 */
class DayService {
  itemDto(i) {
    return {
      id: i.id,
      ruleId: i.ruleId,
      kind: i.kind,
      name: i.name,
      date: i.date ? dbToCivilDate(i.date) : null,
      originDate: i.originDate ? dbToCivilDate(i.originDate) : null,
      startMinute: i.startMinute,
      endMinute: i.endMinute,
      period: i.period,
      variant: i.variant,
      icon: i.icon ?? null,
      status: i.status,
      doneAt: i.doneAt,
      doneMinute: i.doneMinute,
      skipReason: i.skipReason,
      isOverridden: i.isOverridden,
      notes: i.notes,
      category: i.category ?? null,
      insideRuleIds: i.rule?.insideRuleIds ?? [],
      steps: (i.steps ?? []).map((s) => ({ id: s.id, key: s.stepKey, name: s.name, minute: s.minute ?? null, doneAt: s.doneAt })),
    };
  }

  /** Office or home for each day of `from`…`to`: `{ value, isDefault }` by date. */
  async modeMap(userId, from, to, options = {}) {
    const settings = await UserSettingsDao.routine(userId, options);
    const switched = new Map((await DayModeDao.between(userId, from, to, options)).map((d) => [dbToCivilDate(d.date), d.mode]));
    const officeDays = settings?.officeDays ?? [];
    return new Map(
      datesBetween(from, to).map((date) => [date, { value: dayMode(date, officeWeekdaysOn(officeDays, date), switched.get(date)), isDefault: !switched.has(date) }]),
    );
  }

  /** True when office/home changes anything for this user (office days set, or a rule tied to one). */
  async modeRelevant(userId, options = {}) {
    const settings = await UserSettingsDao.routine(userId, options);
    if ((settings?.officeDays ?? []).some((change) => change.weekdays.length)) return true;
    return (await RoutineRuleDao.countOwned(userId, { mode: { not: null } }, options)) > 0;
  }

  /**
   * Makes the rule items of `from`…`to` that do not exist yet (a day already
   * opened keeps its items), with their steps. Always in a transaction.
   */
  async materialize(userId, from, to, options = {}) {
    if (!options.tx) return withTransaction((tx) => this.materialize(userId, from, to, { tx }));
    const rules = await RoutineRuleDao.activeBetween(userId, from, to, options);
    if (rules.length === 0) return 0;
    const modes = await this.modeMap(userId, from, to, options);
    const rows = [];
    for (const date of datesBetween(from, to)) {
      const mode = modes.get(date).value;
      for (const rule of rules) {
        const days = { weekdays: rule.weekdays, startDate: dbToCivilDate(rule.startDate), endDate: rule.endDate ? dbToCivilDate(rule.endDate) : null };
        if (!occursOn(days, date) || !fitsMode(rule.mode, mode)) continue;
        rows.push({
          ruleId: rule.id,
          seriesId: rule.seriesId,
          originDate: civilDateToDb(date),
          date: civilDateToDb(date),
          kind: rule.kind,
          name: rule.name,
          categoryId: rule.categoryId,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
          period: rule.period,
          variant: rule.variant,
          icon: rule.icon,
        });
      }
    }
    const stepsByRule = new Map(rules.filter((r) => Array.isArray(r.steps) && r.steps.length).map((r) => [r.id, r.steps]));
    return DayItemDao.createFromRules(userId, rows, stepsByRule, options);
  }

  /**
   * Makes the days `from`…`to` again after office/home changed: untouched items
   * of rules tied to office or home go away, then the rules that fit each day
   * now are made. Items done, skipped, edited or with a step checked stay.
   */
  async redo(userId, from, to, options) {
    await DayItemDao.deleteManyOwned(
      userId,
      { date: { gte: civilDateToDb(from), lte: civilDateToDb(to) }, ruleId: { not: null }, rule: { is: { mode: { not: null } } }, ...UNTOUCHED },
      options,
    );
    await this.materialize(userId, from, to, options);
  }

  /** Adds each step's current streak (days in a row done, up to `asOf`). */
  async withStreaks(userId, items, asOf) {
    const keys = [...new Set(items.flatMap((i) => i.steps.map((s) => s.key)))];
    if (keys.length === 0) return items;
    const byKey = new Map(keys.map((key) => [key, []]));
    for (const row of await DayItemDao.stepHistory(userId, keys, asOf)) {
      byKey.get(row.stepKey).push({ date: dbToCivilDate(row.dayItem.date), done: Boolean(row.doneAt), skipped: row.dayItem.status === "SKIPPED" });
    }
    const current = new Map(keys.map((key) => [key, streak(byKey.get(key), asOf).current]));
    return items.map((i) => (i.steps.length ? { ...i, steps: i.steps.map((s) => ({ ...s, streak: current.get(s.key) })) } : i));
  }

  /**
   * The Dia tab of `date`: timed items (and parts of the day) in order, "a
   * qualquer hora", office or home, the progress and, when `date` is today, the
   * late tasks of earlier days and the tasks without a date ("A fazer").
   */
  async get(userId, date) {
    const today = todayIn();
    const isToday = date === today;
    await this.materialize(userId, date, date);
    const [items, overdue, inbox, modes, relevant, water] = await Promise.all([
      DayItemDao.onDate(userId, date),
      isToday ? DayItemDao.overdueTasks(userId, today) : [],
      isToday ? DayItemDao.inbox(userId) : [],
      this.modeMap(userId, date, date),
      this.modeRelevant(userId),
      WaterService.summary(userId, date),
    ]);
    const dtos = this.withLists(await this.withStreaks(userId, items.map((i) => this.itemDto(i)), date));
    const { timed, anytime } = splitTimeline(dtos);
    return {
      date,
      today,
      mode: { ...modes.get(date), relevant },
      items: timed,
      anytime,
      overdue: overdue.map((i) => this.itemDto(i)),
      inbox: inbox.map((i) => this.itemDto(i)),
      progress: dayProgress(dtos),
      water,
    };
  }

  /**
   * Lists inside blocks: each block of the day gets the lists ("Rotina diária")
   * set to show inside its rule, as `lists: [{ itemId, name, steps }]`. The
   * steps are the list item's own, so a check anywhere is the same check.
   */
  withLists(items) {
    const lists = items.filter((i) => i.insideRuleIds.length && i.steps.length);
    if (lists.length === 0) return items;
    return items.map((item) => {
      if (!item.ruleId) return item;
      const inside = lists.filter((l) => l.id !== item.id && l.insideRuleIds.includes(item.ruleId)).map((l) => ({ itemId: l.id, name: l.name, status: l.status, steps: l.steps }));
      return inside.length ? { ...item, lists: inside } : item;
    });
  }

  /** The Semana tab: Monday to Sunday of the week of `date`, each day with its items in order. */
  async week(userId, date) {
    const from = weekStart(date);
    const to = addDays(from, 6);
    await this.materialize(userId, from, to);
    const [items, modes, relevant] = await Promise.all([DayItemDao.between(userId, from, to), this.modeMap(userId, from, to), this.modeRelevant(userId)]);
    const byDate = new Map(datesBetween(from, to).map((d) => [d, []]));
    for (const item of items) byDate.get(dbToCivilDate(item.date)).push(this.itemDto(item));
    const days = [...byDate].map(([day, raw]) => {
      const list = this.withLists(raw);
      const { timed, anytime } = splitTimeline(list);
      return { date: day, mode: modes.get(day), items: timed, anytime, progress: dayProgress(list) };
    });
    return { from, to, today: todayIn(), modeRelevant: relevant, days };
  }

  /** Switches a day between office and home (`null` = back to its weekday's default) and remakes it. */
  async setMode(userId, date, mode) {
    await withTransaction(async (tx) => {
      if (mode) await DayModeDao.set(userId, date, mode, { tx });
      else await DayModeDao.clear(userId, date, { tx });
      await this.redo(userId, date, date, { tx });
    });
    return this.get(userId, date);
  }

  async findOrThrow(userId, id, options) {
    const item = await DayItemDao.findOwnedWithCategory(userId, id, options);
    if (!item) throw new NotFoundError("Item não encontrado.");
    return item;
  }

  /** Locks the item for the rest of the transaction (see DayItemDao.lock) and reads it. */
  async lockOrThrow(userId, id, options) {
    if (!(await DayItemDao.lock(userId, id, options))) throw new NotFoundError("Item não encontrado.");
    return this.findOrThrow(userId, id, options);
  }

  /** Marked now on its own day: done now. Marked on a later day (or no day): the real time is unknown. */
  minuteIfToday(item) {
    return item.date && dbToCivilDate(item.date) === todayIn() ? minuteOfDayIn() : null;
  }

  /**
   * A task or appointment just for `date`, with exact times, a part of the day
   * or no time. `date` null = a task without a date ("A fazer").
   */
  async createOneOff(userId, date, input) {
    const undated = date === null;
    const startMinute = undated ? null : (input.startMinute ?? null);
    const endMinute = undated ? null : (input.endMinute ?? null);
    const period = undated ? null : (input.period ?? null);
    const error = timeError(startMinute, endMinute, period);
    if (error) throw new ValidationError(error, { startMinute: error });
    return withTransaction(async (tx) => {
      const categoryId = await CategoryService.assertUsable(userId, input.categoryId ?? null, { tx });
      const item = await DayItemDao.create(userId, {
        kind: undated ? "TASK" : input.kind,
        name: input.name,
        categoryId,
        date: undated ? null : civilDateToDb(date),
        startMinute,
        endMinute,
        period,
        icon: input.icon ?? null,
        notes: input.notes ?? null,
      }, { tx });
      return this.itemDto(await DayItemDao.findOwnedWithCategory(userId, item.id, { tx }));
    });
  }

  /**
   * Feito / não houve / voltar a pendente. Done can say when it really was
   * (`doneMinute`, "fiz em outro horário") and which workout (`variant`).
   * A block with steps: done checks every step; back from done unchecks them.
   */
  async setStatus(userId, id, { status, reason, doneMinute, variant }, { tx, reviewDate } = {}) {
    if (!tx) return withTransaction((tx) => this.setStatus(userId, id, { status, reason, doneMinute, variant }, { tx, reviewDate }));
    const item = await this.lockOrThrow(userId, id, { tx });
    if (reviewDate && (!item.date || dbToCivilDate(item.date) !== reviewDate)) throw new NotFoundError("Item não encontrado neste dia.");
    if (reviewDate && (item.status !== "PENDING" || item.reviewedAt)) return this.itemDto(item);
    if (variant && item.kind !== "WORKOUT") throw new ValidationError(notWorkout, { variant: notWorkout });
    const done = status === "DONE";
    const now = new Date();
    const data = {
      status: status === "NOT_DONE" ? "PENDING" : status,
      reviewedAt: status === "NOT_DONE" ? now : null,
      doneAt: done ? now : null,
      doneMinute: done ? (doneMinute ?? this.minuteIfToday(item)) : null,
      skipReason: status === "SKIPPED" ? (reason ?? null) : null,
    };
    if (variant !== undefined && item.kind === "WORKOUT") data.variant = variant;
    if (item.steps.length && done) await DayItemDao.updateSteps(userId, id, { doneAt: null }, { doneAt: now }, { tx });
    if (item.steps.length && status === "PENDING" && item.status === "DONE") await DayItemDao.updateSteps(userId, id, {}, { doneAt: null }, { tx });
    return this.itemDto(await DayItemDao.updateOwnedWithCategory(userId, id, data, { tx }));
  }

  async review(userId, date, ids, status) {
    if (date >= todayIn()) throw new ValidationError("Revise apenas dias que já passaram.");
    await withTransaction(async (tx) => {
      for (const id of [...new Set(ids)].sort()) await this.setStatus(userId, id, { status }, { tx, reviewDate: date });
    });
  }

  /**
   * "Afazeres só neste dia": replaces the item's steps. Steps sent with their
   * `id` keep their check (and streak key); new ones get a new key. The item
   * then stops following its rule's steps (kept when the rule changes), and
   * its status follows the steps: a new step on a done block reopens it.
   */
  async setSteps(userId, id, { steps }) {
    return withTransaction(async (tx) => {
      const item = await this.lockOrThrow(userId, id, { tx });
      if (!item.date) throw new ValidationError("Escolha um dia antes de colocar afazeres.", { steps: "Escolha um dia antes de colocar afazeres." });
      const byId = new Map(item.steps.map((s) => [s.id, s]));
      const kept = [];
      const created = [];
      const list = [];
      for (const step of steps) {
        const name = step.name.trim();
        if (!name) continue;
        const minute = step.minute ?? null;
        const old = step.id ? byId.get(step.id) : null;
        if (old && !kept.some((k) => k.id === old.id)) {
          kept.push({ id: old.id, name, minute, sortOrder: list.length });
          list.push({ doneAt: old.doneAt });
        } else {
          created.push({ stepKey: randomUUID(), name, minute, sortOrder: list.length });
          list.push({ doneAt: null });
        }
      }
      await DayItemDao.replaceSteps(userId, id, { kept, created }, { tx });
      const data = { isOverridden: true };
      if (item.status !== "SKIPPED" && list.length) {
        const status = statusFromSteps(list);
        if (status !== item.status) Object.assign(data, { status, doneAt: status === "DONE" ? new Date() : null, doneMinute: status === "DONE" ? this.minuteIfToday(item) : null });
      }
      await DayItemDao.updateOwnedWithCategory(userId, id, data, { tx });
      const [withStreaks] = await this.withStreaks(userId, [this.itemDto(await DayItemDao.findOwnedWithCategory(userId, id, { tx }))], dbToCivilDate(item.date));
      return withStreaks;
    });
  }

  /** Checks or unchecks one step of a block; the block is done when all its steps are. */
  async setStep(userId, id, stepId, { done }) {
    return withTransaction(async (tx) => {
      const item = await this.lockOrThrow(userId, id, { tx });
      if (!item.steps.some((s) => s.id === stepId)) throw new NotFoundError("Afazer não encontrado.");
      if (item.status === "SKIPPED") throw new ConflictError("Este bloco está como “não houve”. Volte para pendente antes de marcar os afazeres.");
      const now = new Date();
      await DayItemDao.updateStep(userId, id, stepId, { doneAt: done ? now : null }, { tx });
      const status = statusFromSteps(item.steps.map((s) => (s.id === stepId ? { doneAt: done ? now : null } : s)));
      const data = status === item.status ? {} : { status, doneAt: status === "DONE" ? now : null, doneMinute: status === "DONE" ? this.minuteIfToday(item) : null };
      return this.itemDto(await DayItemDao.updateOwnedWithCategory(userId, id, data, { tx }));
    });
  }

  /**
   * "Só hoje": changes this item only (name, times or part of the day,
   * category, workout, notes) or moves it to another day ("remarcar"). A task
   * without a rule may also lose or get a date. A rule item then stops
   * following its rule.
   */
  async update(userId, id, changes) {
    return withTransaction(async (tx) => {
      const item = await this.lockOrThrow(userId, id, { tx });
      const has = (key) => key in changes;
      let startMinute = has("startMinute") ? changes.startMinute : item.startMinute;
      let endMinute = has("endMinute") ? changes.endMinute : has("startMinute") && changes.startMinute === null ? null : item.endMinute;
      let period = has("period") ? changes.period : has("startMinute") && changes.startMinute !== null ? null : item.period;
      if (has("period") && changes.period && !has("startMinute")) {
        startMinute = null;
        endMinute = null;
      }
      const undated = has("date") ? changes.date === null : item.date === null;
      if (undated) {
        if (item.ruleId || item.kind !== "TASK") throw new ValidationError("Só tarefas avulsas ficam sem data.", { date: "Escolha o dia." });
        startMinute = null;
        endMinute = null;
        period = null;
      }
      const error = timeError(startMinute, endMinute, period);
      if (error) throw new ValidationError(error, { startMinute: error });
      if (has("variant") && changes.variant && item.kind !== "WORKOUT") throw new ValidationError(notWorkout, { variant: notWorkout });

      const data = { startMinute, endMinute, period, isOverridden: item.ruleId ? true : item.isOverridden };
      if (has("name")) data.name = changes.name;
      if (has("notes")) data.notes = changes.notes;
      if (has("variant")) data.variant = changes.variant;
      if (has("icon")) data.icon = changes.icon;
      if (has("categoryId") && changes.categoryId !== item.categoryId) {
        data.categoryId = await CategoryService.assertUsable(userId, changes.categoryId, { tx });
      }
      if (has("date")) data.date = changes.date === null ? null : civilDateToDb(changes.date);
      const dayChanged = has("date") && changes.date !== (item.date ? dbToCivilDate(item.date) : null);
      if (dayChanged || startMinute !== item.startMinute || period !== item.period) {
        Object.assign(data, this.scheduleBeforeChange(item), { reviewedAt: null });
      }
      return this.itemDto(await DayItemDao.updateOwnedWithCategory(userId, id, data, { tx }));
    });
  }

  /** "Atrasar": moves the times by `minutes`, keeping the length. */
  async shift(userId, id, { minutes }) {
    return withTransaction(async (tx) => {
      const item = await this.lockOrThrow(userId, id, { tx });
      const moved = shiftMinutes(item.startMinute, item.endMinute, minutes);
      if (!moved) {
        const message = item.startMinute === null ? "Este item não tem horário." : "Assim o item passaria da meia-noite. Remarque para outro dia.";
        throw new ValidationError(message, { minutes: message });
      }
      const data = { ...moved, ...this.scheduleBeforeChange(item), reviewedAt: null, isOverridden: item.ruleId ? true : item.isOverridden };
      return this.itemDto(await DayItemDao.updateOwnedWithCategory(userId, id, data, { tx }));
    });
  }

  scheduleBeforeChange(item) {
    return item.date && !item.scheduledDate ? { scheduledDate: item.date, scheduledMinute: item.startMinute } : {};
  }

  /** Only one-off items are deleted; a rule item is marked "não houve" (or the rule is changed). */
  async remove(userId, id) {
    const item = await this.findOrThrow(userId, id);
    if (item.ruleId) throw new ConflictError("Este item vem da rotina fixa. Marque “não houve” ou mude o item fixo.");
    await DayItemDao.deleteOwned(userId, id);
  }
}

export default new DayService();
