import { randomUUID } from "node:crypto";
import DayItemDao, { UNTOUCHED } from "../daos/DayItemDao.js";
import RoutineRuleDao from "../daos/RoutineRuleDao.js";
import { withTransaction } from "../database/transaction.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { addDays, civilDateToDb, dbToCivilDate, todayIn } from "../utils/dateUtils.js";
import { normalizeSteps, normalizeWeekdays, timeError } from "../utils/routineUtils.js";
import CategoryService from "./CategoryService.js";

const FIELDS = ["kind", "name", "categoryId", "weekdays", "startMinute", "endMinute", "period", "mode", "variant", "icon", "steps", "insideRuleIds", "skipOnHolidays", "notes"];

/**
 * Fixed items ("rotina fixa"). A rule never changes the past: editing or
 * removing it "daqui pra frente" (from day D) closes it on D − 1 and, when
 * editing, starts a new rule on D. See docs/ARCHITECTURE.md → "Modelo (etapa 2)".
 */
class RuleService {
  dto(r) {
    return {
      id: r.id,
      kind: r.kind,
      name: r.name,
      categoryId: r.categoryId,
      weekdays: r.weekdays,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      period: r.period,
      mode: r.mode,
      variant: r.variant,
      icon: r.icon ?? null,
      steps: r.steps ?? [],
      insideRuleIds: r.insideRuleIds ?? [],
      startDate: dbToCivilDate(r.startDate),
      endDate: r.endDate ? dbToCivilDate(r.endDate) : null,
      skipOnHolidays: r.skipOnHolidays,
      notes: r.notes,
    };
  }

  /** The rules in effect today or later (ended ones are history). */
  async list(userId) {
    const today = civilDateToDb(todayIn());
    const rows = await RoutineRuleDao.findAllOwned(userId, {
      where: { OR: [{ endDate: null }, { endDate: { gte: today } }] },
      orderBy: [{ startMinute: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    });
    return rows.map((r) => this.dto(r));
  }

  /** Checks and normalizes the values of a rule (whole, after merging an edit). */
  async values(userId, input, options, existingCategoryId = null) {
    const period = input.period ?? null;
    const error = timeError(input.startMinute ?? null, input.endMinute ?? null, period);
    if (error) throw new ValidationError(error, { startMinute: error });
    const steps = normalizeSteps(input.steps ?? [], randomUUID);
    const weekdays = normalizeWeekdays(input.weekdays);
    if (weekdays.length === 0) throw new ValidationError("Escolha pelo menos um dia da semana.", { weekdays: "Escolha pelo menos um dia da semana." });
    return {
      kind: "ROUTINE",
      name: input.name,
      categoryId: input.categoryId === existingCategoryId ? existingCategoryId : await CategoryService.assertUsable(userId, input.categoryId, options),
      weekdays,
      startMinute: input.startMinute ?? null,
      endMinute: input.endMinute ?? null,
      period,
      mode: input.mode ?? null,
      variant: null,
      icon: input.icon ?? null,
      steps,
      insideRuleIds: await this.insideIds(userId, input.insideRuleIds ?? [], steps, options),
      skipOnHolidays: input.skipOnHolidays ?? false,
      notes: input.notes ?? null,
    };
  }

  async create(userId, input, { seriesId } = {}) {
    return withTransaction(async (tx) => {
      const data = await this.values(userId, input, { tx });
      const startDate = input.startDate ?? todayIn();
      if (input.endDate && input.endDate < startDate) throw new ValidationError("O fim precisa ser depois do início.", { endDate: "O fim precisa ser depois do início." });
      const rule = await RoutineRuleDao.create(userId, { ...data, seriesId, startDate: civilDateToDb(startDate), endDate: input.endDate ? civilDateToDb(input.endDate) : null }, { tx });
      return this.dto(rule);
    });
  }

  /** The blocks a list shows inside: the user's own rules, only when the list has steps. */
  async insideIds(userId, ids, steps, options) {
    const unique = [...new Set(ids)];
    if (unique.length === 0 || steps.length === 0) return [];
    const found = await RoutineRuleDao.findAllOwned(userId, { where: { id: { in: unique } }, select: { id: true } }, options);
    if (found.length !== unique.length) throw new ValidationError("Escolha blocos da sua rotina.", { insideRuleIds: "Escolha blocos da sua rotina." });
    return unique;
  }

  async findOrThrow(userId, id, options) {
    const rule = await RoutineRuleDao.findOwned(userId, id, options);
    if (!rule) throw new NotFoundError("Item fixo não encontrado.");
    return rule;
  }

  /** Items of the rule from `from` on that nobody touched (no step checked either): recreated by the new rule, so deleted. */
  dropFutureCopies(userId, ruleId, from, options) {
    return DayItemDao.deleteManyOwned(userId, { ruleId, originDate: { gte: civilDateToDb(from) }, ...UNTOUCHED }, options);
  }

  /**
   * "Daqui pra frente": the change applies from `from` (default today).
   * From the rule's first day (or before) the rule itself is changed.
   */
  async update(userId, id, { from, ...changes }) {
    return withTransaction(async (tx) => {
      const rule = await this.findOrThrow(userId, id, { tx });
      const current = this.dto(rule);
      const merged = { ...Object.fromEntries(FIELDS.map((f) => [f, current[f]])), ...changes };
      const data = await this.values(userId, merged, { tx }, current.categoryId);
      const start = from ?? todayIn();
      if (current.endDate && start > current.endDate) throw new ValidationError("Este item fixo já terminou antes dessa data.", { from: "Escolha uma data em que o item ainda vale." });

      await this.dropFutureCopies(userId, id, start, { tx });
      if (start <= current.startDate) {
        return this.dto(await RoutineRuleDao.updateOwned(userId, id, data, { tx }));
      }
      // Close the old rule on the day before and continue with a new one. Items it already
      // made from `start` on that were done, skipped or edited move to the new rule (no duplicates).
      await RoutineRuleDao.updateOwned(userId, id, { endDate: civilDateToDb(addDays(start, -1)) }, { tx });
      const next = await RoutineRuleDao.create(userId, { ...data, seriesId: rule.seriesId, startDate: civilDateToDb(start), endDate: rule.endDate }, { tx });
      await DayItemDao.updateManyOwned(userId, { ruleId: id, originDate: { gte: civilDateToDb(start) } }, { ruleId: next.id }, { tx });
      // Lists shown inside the old version also show inside the new one.
      await tx.$executeRaw`UPDATE "routine_rules" SET "inside_rule_ids" = array_append("inside_rule_ids", ${next.id}::uuid) WHERE "user_id" = ${userId}::uuid AND ${id}::uuid = ANY("inside_rule_ids")`;
      return this.dto(next);
    });
  }

  /**
   * "Daqui pra frente, só em alguns dias": the chosen weekdays get the changes
   * as a new fixed item from `from` on; the rule keeps the other weekdays.
   * Choosing all its weekdays is a plain update. Lists shown inside the rule
   * also show inside the new one.
   */
  async split(userId, id, { from, weekdays, ...changes }) {
    const rule = await this.findOrThrow(userId, id);
    const current = this.dto(rule);
    const chosen = normalizeWeekdays(weekdays).filter((d) => current.weekdays.includes(d));
    if (chosen.length === 0) throw new ValidationError("Escolha pelo menos um dia deste fixo.", { weekdays: "Escolha pelo menos um dia deste fixo." });
    const rest = current.weekdays.filter((d) => !chosen.includes(d));
    if (rest.length === 0) return this.update(userId, id, { from, ...changes });
    const start = from ?? todayIn();
    const kept = await this.update(userId, id, { from: start, weekdays: rest });
    const base = Object.fromEntries(FIELDS.map((f) => [f, current[f]]));
    const created = await this.create(userId, { ...base, ...changes, steps: changes.steps ?? current.steps, weekdays: chosen, startDate: start, endDate: current.endDate }, { seriesId: rule.seriesId });
    await withTransaction(async (tx) => {
      await tx.$executeRaw`UPDATE "routine_rules" SET "inside_rule_ids" = array_append("inside_rule_ids", ${created.id}::uuid) WHERE "user_id" = ${userId}::uuid AND ${id}::uuid = ANY("inside_rule_ids")`;
      // Items already touched on the chosen weekdays (kept by the update) belong to the new rule: no duplicate that day.
      await tx.$executeRaw`UPDATE "day_items" SET "rule_id" = ${created.id}::uuid WHERE "user_id" = ${userId}::uuid AND "rule_id" = ${kept.id}::uuid AND "origin_date" >= ${start}::date AND EXTRACT(DOW FROM "origin_date")::int = ANY(${chosen}::int[])`;
    });
    return created;
  }

  /**
   * Removes the rule from `from` on (default today). Its future copies go away; the past stays.
   * From the rule's first day, the rule is deleted: items it made that were done, skipped or
   * edited stay in their days as one-off items.
   */
  async remove(userId, id, { from } = {}) {
    return withTransaction(async (tx) => {
      const rule = await this.findOrThrow(userId, id, { tx });
      const start = from ?? todayIn();
      await this.dropFutureCopies(userId, id, start, { tx });
      if (start > dbToCivilDate(rule.startDate)) {
        await DayItemDao.updateManyOwned(userId, { ruleId: id, originDate: { gte: civilDateToDb(start) } }, { ruleId: null, originDate: null, isOverridden: true }, { tx });
        await RoutineRuleDao.updateOwned(userId, id, { endDate: civilDateToDb(addDays(start, -1)) }, { tx });
        return;
      }
      await DayItemDao.updateManyOwned(userId, { ruleId: id }, { ruleId: null, originDate: null, isOverridden: true }, { tx });
      await RoutineRuleDao.deleteOwned(userId, id, { tx });
    });
  }
}

export default new RuleService();
