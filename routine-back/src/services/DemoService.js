import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../database/prisma.js";
import DayItemDao from "../daos/DayItemDao.js";
import UserDao from "../daos/UserDao.js";
import { addDays, civilDateToDb, dbToCivilDate, todayIn } from "../utils/dateUtils.js";
import { weekdayOf } from "../utils/routineUtils.js";
import CategoryService from "./CategoryService.js";
import DayService from "./DayService.js";
import GoalService from "./GoalService.js";
import RoutineSettingsService from "./RoutineSettingsService.js";
import RuleService from "./RuleService.js";
import SimulationService from "./SimulationService.js";
import SpecialDayService from "./SpecialDayService.js";
import { DEMO_EMAIL_DOMAIN, DEMO_LIFETIME_HOURS, DEMO_MAX_ACCOUNTS, DEMO_NAME } from "../shared/constants.js";
import logger from "./logger.js";
import UserService from "./UserService.js";

/** How many weeks of history the demo person has before today. */
const HISTORY_WEEKS = 3;

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
/** Marina goes to the office on Tuesdays and Thursdays: the commute is a fixed item on those days. */
const OFFICE_DAYS = [2, 4];
/** [name, kind, category, weekdays, start minute, end minute, extra fields] */
const DEMO_ROUTINE = [
  ["Acordar", "ROUTINE", "Pessoal", WEEKDAYS, 390, 420],
  ["Condução", "ROUTINE", "Condução", OFFICE_DAYS, 420, 480],
  ["Trabalho", "ROUTINE", "Trabalho", WEEKDAYS, 480, 720],
  ["Almoço", "ROUTINE", "Refeição", WEEKDAYS, 720, 780],
  ["Trabalho", "ROUTINE", "Trabalho", WEEKDAYS, 780, 1020],
  ["Condução", "ROUTINE", "Condução", OFFICE_DAYS, 1020, 1080],
  ["Inglês", "ROUTINE", "Estudo", [1, 3], 1110, 1170],
  ["Yoga", "ROUTINE", "Treino", [2, 4], 1140, 1200],
  ["Corrida", "ROUTINE", "Treino", [6], 480, 540],
  // Lists: small things without a time of their own, shown inside the blocks named in `inside`.
  ["Rotina diária", "ROUTINE", "Rotina diária", EVERY_DAY, null, null, { steps: ["Ler 2 páginas de um livro", "Revisar flashcards (2 min)", "Uma lição de inglês no aplicativo"], inside: ["Condução", "Almoço"] }],
  ["Rotina do trabalho", "ROUTINE", "Trabalho", WEEKDAYS, null, null, { steps: ["Ver os dashboards", "Ver se o site está no ar", "Separar as tarefas do dia"], inside: ["Trabalho"] }],
  ["Rotina de dormir", "ROUTINE", "Pessoal", EVERY_DAY, 1350, 1410, { steps: ["Sem telas", "Ler um pouco", "Banho", "Chá"] }],
];

/**
 * Demonstration accounts: a fictional person with a few weeks of routine, so
 * anyone can try the app from the login screen without signing up. Each
 * visitor gets their own copy (nobody sees what another visitor typed), built
 * through the same services as the real app so every rule holds. A copy is
 * deleted when the visitor leaves it or after DEMO_LIFETIME_HOURS.
 *
 * The routine itself (fixed blocks, habits, classes…) is added stage by stage,
 * as each part of the app exists.
 */
class DemoService {
  isDemo(user) {
    return Boolean(user?.demoExpiresAt);
  }

  /** Deletes the demo if `user` is one (leaving it: nothing of it is kept). */
  async discard(user) {
    if (!this.isDemo(user)) return;
    await UserDao.deleteById(user.id).catch(() => {}); // already gone: fine
  }

  /** Builds a new demo account. Returns `{ userId, expiresAt }`. */
  async create() {
    const started = Date.now();
    const pruned = await UserDao.pruneDemos(DEMO_MAX_ACCOUNTS - 1);
    if (pruned) logger.info("Old demo accounts removed", { count: pruned });
    const expiresAt = new Date(Date.now() + DEMO_LIFETIME_HOURS * 3_600_000);
    const email = `demo-${randomBytes(9).toString("base64url").toLowerCase()}@${DEMO_EMAIL_DOMAIN}`;
    try {
      const userId = await this.build(email, expiresAt);
      logger.info("Demo account created", { ms: Date.now() - started });
      return { userId, expiresAt };
    } catch (error) {
      // Half-built: remove it rather than leave a broken demo behind.
      const partial = await UserDao.findByEmail(email).catch(() => null);
      if (partial) await UserDao.deleteById(partial.id).catch(() => {});
      throw error;
    }
  }

  /** The fictional person. Returns the user id. */
  async build(email, expiresAt) {
    const { id: userId } = await UserService.create({ email, name: DEMO_NAME, password: randomBytes(32).toString("base64url"), demoExpiresAt: expiresAt });
    // Started using the app a few weeks ago (reports begin there), onboarding done.
    const startedAt = new Date(Date.now() - HISTORY_WEEKS * 7 * 86_400_000);
    await UserDao.updateById(userId, { createdAt: startedAt, onboardingCompletedAt: new Date() });
    await this.routine(userId);
    return userId;
  }

  /**
   * Marina's week (stages 2 and 3): the commute on Tuesday and Thursday (office
   * days), English, yoga and a Saturday workout, a daily
   * checklist and a bedtime routine,
   * started HISTORY_WEEKS ago. The past days were mostly done, a few were
   * "não houve" and a few were missed, picked by a fixed pattern so every demo
   * looks the same. Plus one late task, one task and one appointment today.
   */
  async routine(userId) {
    const today = todayIn();
    const start = addDays(today, -HISTORY_WEEKS * 7);
    const categories = await CategoryService.list(userId);
    const cat = (name) => categories.find((c) => c.name === name)?.id ?? null;
    const created = [];
    for (const [name, kind, category, weekdays, startMinute, endMinute, { inside = [], ...extra } = {}] of DEMO_ROUTINE) {
      const steps = extra.steps?.map((stepName) => ({ name: stepName }));
      // Blocks are listed before the lists, so the ones a list shows inside already exist.
      const insideRuleIds = created.filter((r) => inside.includes(r.name)).map((r) => r.id);
      created.push(await RuleService.create(userId, { name, kind, categoryId: cat(category), weekdays, startMinute, endMinute, startDate: start, skipOnHolidays: !steps && category !== "Treino", ...extra, steps, insideRuleIds }));
    }

    // Last week: Monday was a holiday (work and commute skip it), Tuesday a
    // pipe burst and took the yoga, Wednesday an extra class took the English.
    const lastMonday = addDays(today, -((weekdayOf(today) + 6) % 7) - 7);
    await SpecialDayService.create(userId, { kind: "HOLIDAY", from: lastMonday, name: "Feriado municipal" });
    await SpecialDayService.create(userId, { kind: "VACATION", from: addDays(today, 21), to: addDays(today, 25), name: "Férias na praia" });

    const yesterday = addDays(today, -1);
    await DayService.materialize(userId, start, yesterday);
    const past = await DayItemDao.findAllOwned(userId, { select: { id: true, startMinute: true, endMinute: true }, orderBy: [{ date: "asc" }, { startMinute: "asc" }, { id: "asc" }] });
    const done = [];
    const skipped = [];
    past.forEach(({ id }, i) => {
      if (i % 11 === 4) skipped.push(id);
      else if (i % 7 !== 3) done.push(id); // the rest stay as missed
    });
    await DayItemDao.updateManyOwned(userId, { id: { in: done } }, { status: "DONE", doneAt: new Date() });
    await DayItemDao.updateManyOwned(userId, { id: { in: skipped } }, { status: "SKIPPED", skipReason: "Não houve" });
    // Blocks done had every step checked.
    await prisma.dayItemStep.updateMany({ where: { userId, dayItem: { status: "DONE" } }, data: { doneAt: new Date() } });

    const doneIds = new Set(done);
    const skippedIds = new Set(skipped);
    const delayed = past.filter((item) => doneIds.has(item.id) && item.startMinute !== null).filter((_, index) => index % 9 === 5);
    for (const item of delayed) {
      await DayItemDao.updateOwned(userId, item.id, { doneMinute: Math.min(1439, item.startMinute + 35) });
    }
    await this.weekendsAndImprevistos(userId, today, lastMonday, cat);

    const moved = past.filter((item) => !doneIds.has(item.id) && !skippedIds.has(item.id) && item.startMinute !== null && (item.endMinute ?? item.startMinute) < 1410);
    for (const item of moved.slice(-2)) await DayService.shift(userId, item.id, { minutes: 30 });

    await DayService.createOneOff(userId, addDays(today, -2), { kind: "TASK", name: "Marcar dentista" });
    await DayService.createOneOff(userId, today, { kind: "TASK", name: "Comprar presente da Ju", categoryId: cat("Pessoal") });
    // Today's afternoon of work has its own steps (only today): the meeting at 15:00 and a report.
    const day = await DayService.get(userId, today);
    const work = day.items.find((i) => i.name === "Trabalho" && i.startMinute === 780);
    if (work) await DayService.setSteps(userId, work.id, { steps: [{ name: "Reunião com cliente", minute: 900 }, { name: "Mandar o relatório" }] });
    // A task for a part of the day (next Saturday morning) and two without a date ("A fazer").
    const saturday = addDays(today, ((6 - new Date(`${today}T12:00:00Z`).getUTCDay() + 7) % 7) || 7);
    await DayService.createOneOff(userId, saturday, { kind: "TASK", name: "Fazer comida da semana", categoryId: cat("Refeição"), period: "MORNING" });
    // Water: most past days reached 2 L (a few did not), today 1,2 L so far.
    const water = [];
    for (let d = HISTORY_WEEKS * 7; d >= 1; d--) {
      const date = civilDateToDb(addDays(today, -d));
      const amounts = d % 6 === 2 ? [500, 400] : [500, 500, 600, 500];
      for (const amountMl of amounts) water.push({ userId, date, amountMl });
    }
    for (const amountMl of [500, 300, 400]) water.push({ userId, date: civilDateToDb(today), amountMl });
    await prisma.waterLog.createMany({ data: water });

    const goals = [
      { name: "Beber 2 L de água", subject: "WATER", unit: "ML", amount: 2000, period: "DAY" },
      { name: "Treinar três vezes", subject: "WORKOUT", unit: "COUNT", amount: 3, period: "WEEK" },
      { name: "Cumprir 80% da rotina", subject: "ROUTINE", unit: "PERCENT", amount: 80, period: "WEEK" },
    ];
    for (const goal of goals) await GoalService.save(userId, goal);

    // A simulation: the same week with a gym before work.
    const simulation = await SimulationService.create(userId, { name: "Com academia de manhã", from: "current" });
    const gym = { key: randomUUID(), name: "Academia", categoryId: cat("Treino"), icon: null, weekdays: [1, 3, 5], startMinute: 330, endMinute: 385, period: null, steps: [], insideKeys: [] };
    await SimulationService.update(userId, simulation.id, { blocks: [...simulation.blocks, gym] });

    await DayService.createOneOff(userId, null, { kind: "TASK", name: "Renovar a CNH" });
    await DayService.createOneOff(userId, null, { kind: "TASK", name: "Trocar a lâmpada da cozinha", categoryId: cat("Pessoal") });
  }

  /**
   * The weekend is where Marina slips: about half of the bedtime routines and
   * daily lists of Saturdays and Sundays were left undone (the reports' "ponto
   * de atenção"). And three imprevistos: a Saturday freelance, a burst pipe that
   * took the yoga and an extra class that took the English (still in the score,
   * with the reason in the reports).
   */
  async weekendsAndImprevistos(userId, today, lastMonday, cat) {
    const lists = await DayItemDao.findAllOwned(userId, { where: { name: { in: ["Rotina de dormir", "Rotina diária"] }, date: { lt: civilDateToDb(today) } }, select: { id: true, date: true }, orderBy: [{ date: "asc" }, { id: "asc" }] });
    const weekend = lists.filter((i) => [0, 6].includes(weekdayOf(dbToCivilDate(i.date)))).filter((_, index) => index % 2 === 0).map((i) => i.id);
    await this.undo(userId, weekend);

    const lastSaturday = addDays(today, -(((weekdayOf(today) + 1) % 7) || 7));
    await DayService.createOneOff(userId, lastSaturday, { kind: "APPOINTMENT", name: "Freelance", categoryId: cat("Trabalho"), startMinute: 840, endMinute: 1260, unplanned: true });
    for (const [date, name, takes, startMinute, endMinute] of [
      [addDays(lastMonday, 1), "Cano estourado", "Yoga", 1110, 1260],
      [addDays(lastMonday, 2), "Aula extra", "Inglês", 1080, 1200],
    ]) {
      const day = await DayService.get(userId, date);
      const taken = day.items.filter((i) => i.name === takes).map((i) => i.id);
      await this.undo(userId, taken);
      await DayService.createOneOff(userId, date, { kind: "APPOINTMENT", name, categoryId: name === "Aula extra" ? cat("Trabalho") : null, startMinute, endMinute, unplanned: true, displaceIds: taken });
    }
  }

  /** Back to not done (and every step unchecked). */
  async undo(userId, ids) {
    if (!ids.length) return;
    await DayItemDao.updateManyOwned(userId, { id: { in: ids } }, { status: "PENDING", doneAt: null, doneMinute: null, skipReason: null });
    await prisma.dayItemStep.updateMany({ where: { userId, dayItemId: { in: ids } }, data: { doneAt: null } });
  }
}

export default new DemoService();
