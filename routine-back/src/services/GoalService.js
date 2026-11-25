import CategoryDao from "../daos/CategoryDao.js";
import DayItemDao from "../daos/DayItemDao.js";
import PersonalGoalDao from "../daos/PersonalGoalDao.js";
import RoutineRuleDao from "../daos/RoutineRuleDao.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { civilDateToDb, todayIn } from "../utils/dateUtils.js";
import { GOAL_UNITS } from "../utils/reportUtils.js";

function itemLabel(item) {
  if (item.startMinute == null) return item.name;
  const hour = String(Math.floor(item.startMinute / 60)).padStart(2, "0");
  const minute = String(item.startMinute % 60).padStart(2, "0");
  return `${item.name} · ${hour}:${minute}`;
}

class GoalService {
  dto({ id, name, subject, targetKey, targetName, unit, amount, period }) {
    return { id, name, subject, targetKey, targetName, unit, amount, period };
  }

  async list(userId) {
    return (await PersonalGoalDao.findAllOwned(userId, { orderBy: { createdAt: "asc" } })).map((row) => this.dto(row));
  }

  async candidates(userId) {
    const today = todayIn();
    const [categories, rules, datedItems] = await Promise.all([
      CategoryDao.findAllOwned(userId, { where: { isArchived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      RoutineRuleDao.findAllOwned(userId, { where: { OR: [{ endDate: null }, { endDate: { gte: civilDateToDb(today) } }] }, orderBy: [{ startDate: "asc" }, { createdAt: "asc" }] }),
      DayItemDao.findAllOwned(userId, {
        where: { date: { not: null }, OR: [{ seriesId: null }, { isOverridden: true, steps: { some: {} } }] },
        select: { id: true, seriesId: true, name: true, date: true, startMinute: true, steps: { select: { stepKey: true, name: true } } },
        orderBy: { date: "desc" }, take: 100,
      }),
    ]);
    const unique = (rows) => [...new Map(rows.map((row) => [row.id, row])).values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return {
      CATEGORY: categories.map(({ id, name }) => ({ id, label: name })),
      ITEM: unique([
        ...rules.map((rule) => ({ id: rule.seriesId, label: itemLabel(rule) })),
        ...datedItems.filter((item) => !item.seriesId).map((item) => ({ id: item.id, label: itemLabel(item) + " · " + item.date.toISOString().slice(0, 10).split("-").reverse().join("/") })),
      ]),
      STEP: unique([
        ...datedItems.flatMap((item) => item.steps.map((step) => ({ id: step.stepKey, label: step.name + " · " + itemLabel(item) }))),
        ...rules.flatMap((rule) => rule.steps.map((step) => ({ id: step.key, label: step.name + " · " + itemLabel(rule) }))),
      ]),
    };
  }

  async save(userId, input, id) {
    const existing = id ? await PersonalGoalDao.findOwned(userId, id) : null;
    if (id && !existing) throw new NotFoundError("Meta não encontrada.");
    const { subject, unit, amount, targetKey = null } = input;
    if (!GOAL_UNITS[subject].includes(unit)) throw new ValidationError("Unidade inválida.", { unit: "Escolha uma unidade válida para a meta." });
    if (unit === "PERCENT" && amount > 100) throw new ValidationError("O máximo é 100%.", { amount: "Use um valor de 1 a 100." });
    let targetName = null;
    if (["CATEGORY", "ITEM", "STEP"].includes(subject)) {
      const options = await this.candidates(userId);
      const target = options[subject].find(({ id }) => id === targetKey);
      targetName = target?.label ?? (existing?.targetKey === targetKey && existing.subject === subject ? existing.targetName : null);
      if (!targetName) throw new ValidationError("Escolha o que deseja acompanhar.", { targetKey: "Escolha um item da sua rotina." });
    }
    const data = { ...input, targetKey: targetName ? targetKey : null, targetName };
    return this.dto(id ? await PersonalGoalDao.updateOwned(userId, id, data) : await PersonalGoalDao.create(userId, data));
  }

  async remove(userId, id) {
    const { count } = await PersonalGoalDao.deleteManyOwned(userId, { id });
    if (!count) throw new NotFoundError("Meta não encontrada.");
  }
}

export default new GoalService();
