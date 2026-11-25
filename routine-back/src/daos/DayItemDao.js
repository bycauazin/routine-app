import { civilDateToDb } from "../utils/dateUtils.js";
import { BaseDao } from "./BaseDao.js";

const withDetails = {
  category: { select: { id: true, name: true, colorKey: true, icon: true } },
  steps: { select: { id: true, stepKey: true, name: true, minute: true, doneAt: true }, orderBy: { sortOrder: "asc" } },
  rule: { select: { insideRuleIds: true } },
};

/**
 * Rule items nobody touched: still pending, not edited "só hoje", no step
 * checked. These may be deleted and made again (a rule changed "daqui pra
 * frente", a day switched between office and home); the others are kept.
 */
export const UNTOUCHED = Object.freeze({ status: "PENDING", isOverridden: false, reviewedAt: null, steps: { none: { doneAt: { not: null } } } });

class DayItemDao extends BaseDao {
  constructor() {
    super("dayItem");
  }

  /**
   * Creates the rule items of a range; ones that already exist (rule + day)
   * are left alone. Items made now get their rule's steps. Run it inside a
   * transaction, so an item is never left without its steps.
   * @param {Map<string, { key: string, name: string }[]>} stepsByRule
   */
  async createFromRules(userId, rows, stepsByRule, options = {}) {
    if (rows.length === 0) return 0;
    const created = await this.model(options).createManyAndReturn({
      data: rows.map((row) => ({ ...row, userId })),
      skipDuplicates: true,
      select: { id: true, ruleId: true },
    });
    const steps = created.flatMap((item) =>
      (stepsByRule.get(item.ruleId) ?? []).map((step, sortOrder) => ({ userId, dayItemId: item.id, stepKey: step.key, name: step.name, minute: step.minute ?? null, sortOrder })),
    );
    if (steps.length) await this.db(options).dayItemStep.createMany({ data: steps });
    return created.length;
  }

  onDate(userId, date, options = {}) {
    return this.model(options).findMany({ where: { userId, date: civilDateToDb(date) }, include: withDetails, orderBy: { createdAt: "asc" } });
  }

  between(userId, from, to, options = {}) {
    return this.model(options).findMany({
      where: { userId, date: { gte: civilDateToDb(from), lte: civilDateToDb(to) } },
      include: withDetails,
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * One-off tasks still to do from days before `date` ("atrasadas"), oldest first.
   * A fixed task that was missed stays as "não feita" on its day (it comes back on its next day).
   */
  overdueTasks(userId, date, options = {}) {
    return this.model(options).findMany({
      where: { userId, kind: "TASK", ruleId: null, status: "PENDING", date: { lt: civilDateToDb(date) } },
      include: withDetails,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
  }

  /** Tasks without a date still to do ("A fazer"), oldest first. */
  inbox(userId, options = {}) {
    return this.model(options).findMany({
      where: { userId, kind: "TASK", ruleId: null, status: "PENDING", date: null },
      include: withDetails,
      orderBy: { createdAt: "asc" },
    });
  }

  /** The last day that already has items (null when none), to redo future days after a settings change. */
  async lastDate(userId, options = {}) {
    const { _max } = await this.model(options).aggregate({ where: { userId }, _max: { date: true } });
    return _max.date;
  }

  /**
   * Locks the item until the transaction ends, so two quick taps (two steps,
   * or a step and the block) never overwrite each other. False when it is not
   * the user's.
   */
  async lock(userId, id, options = {}) {
    const { count } = await this.model(options).updateMany({ where: { id, userId }, data: { updatedAt: new Date() } });
    return count === 1;
  }

  findOwnedWithCategory(userId, id, options = {}) {
    return this.model(options).findFirst({ where: { id, userId }, include: withDetails });
  }

  updateOwnedWithCategory(userId, id, data, options = {}) {
    return this.model(options).update({ where: { id_userId: { id, userId } }, data, include: withDetails });
  }

  /** Steps of `keys` on days up to `to`, with the day and status of their block (for streaks). */
  stepHistory(userId, keys, to, options = {}) {
    if (keys.length === 0) return [];
    return this.db(options).dayItemStep.findMany({
      where: { userId, stepKey: { in: keys }, dayItem: { date: { lte: civilDateToDb(to) } } },
      select: { stepKey: true, doneAt: true, dayItem: { select: { date: true, status: true } } },
    });
  }

  updateStep(userId, dayItemId, stepId, data, options = {}) {
    return this.db(options).dayItemStep.updateMany({ where: { id: stepId, dayItemId, userId }, data });
  }

  /** Replaces the steps of one item: keeps `kept` (updated), deletes the others, creates `created`. */
  async replaceSteps(userId, dayItemId, { kept, created }, options = {}) {
    const db = this.db(options);
    await db.dayItemStep.deleteMany({ where: { userId, dayItemId, id: { notIn: kept.map((s) => s.id) } } });
    for (const s of kept) await db.dayItemStep.updateMany({ where: { id: s.id, dayItemId, userId }, data: { name: s.name, minute: s.minute, sortOrder: s.sortOrder } });
    if (created.length) await db.dayItemStep.createMany({ data: created.map((s) => ({ ...s, userId, dayItemId })) });
  }

  updateSteps(userId, dayItemId, where, data, options = {}) {
    return this.db(options).dayItemStep.updateMany({ where: { ...where, dayItemId, userId }, data });
  }
}

export default new DayItemDao();
