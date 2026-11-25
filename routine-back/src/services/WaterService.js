import UserSettingsDao from "../daos/UserSettingsDao.js";
import WaterLogDao from "../daos/WaterLogDao.js";
import { NotFoundError } from "../shared/errors.js";
import { civilDateToDb, dbToCivilDate, todayIn } from "../utils/dateUtils.js";
import { datesBetween, streak } from "../utils/routineUtils.js";

/**
 * Water (stage 4): logs typed as a number ("300" ml), the day's total against
 * the goal, undo the last one, and the streak of days that reached the goal.
 * A day without logs counts as missed, but only from the first log on.
 */
class WaterService {
  async goal(userId, options) {
    return (await UserSettingsDao.water(userId, options))?.waterGoalMl ?? 2000;
  }

  logDto(log) {
    return { id: log.id, amountMl: log.amountMl, loggedAt: log.loggedAt };
  }

  /** Total and goal of `date` (the line on the Dia). */
  async summary(userId, date) {
    const [logs, goalMl] = await Promise.all([WaterLogDao.onDate(userId, date), this.goal(userId)]);
    return { totalMl: logs.reduce((sum, l) => sum + l.amountMl, 0), goalMl };
  }

  /** The water screen of `date`: total, goal, the logs and the streak (as of today). */
  async day(userId, date) {
    const [logs, goalMl, totals] = await Promise.all([WaterLogDao.onDate(userId, date), this.goal(userId), WaterLogDao.totalsSince(userId, null)]);
    const today = todayIn();
    let days = [];
    if (totals.length) {
      const byDate = new Map(totals.map((t) => [dbToCivilDate(t.date), t._sum.amountMl ?? 0]));
      const first = dbToCivilDate(totals[0].date);
      days = first <= today ? datesBetween(first, today).map((d) => ({ date: d, done: (byDate.get(d) ?? 0) >= goalMl, skipped: false })) : [];
    }
    return {
      date,
      goalMl,
      totalMl: logs.reduce((sum, l) => sum + l.amountMl, 0),
      logs: logs.map((l) => this.logDto(l)),
      streak: streak(days, today),
    };
  }

  /** "Bebi 300": on `date` (default today), now. */
  async add(userId, { amountMl, date }) {
    const day = date ?? todayIn();
    await WaterLogDao.create(userId, { date: civilDateToDb(day), amountMl });
    return this.day(userId, day);
  }

  /** Desfazer: removes the last log of `date` (default today). */
  async undoLast(userId, { date }) {
    const day = date ?? todayIn();
    const last = await WaterLogDao.lastOn(userId, day);
    if (!last) throw new NotFoundError("Nada para desfazer neste dia.");
    await WaterLogDao.deleteOwned(userId, last.id);
    return this.day(userId, day);
  }

  async remove(userId, id) {
    const log = await WaterLogDao.findOwned(userId, id);
    if (!log) throw new NotFoundError("Registro não encontrado.");
    await WaterLogDao.deleteOwned(userId, id);
    return this.day(userId, dbToCivilDate(log.date));
  }

  async setGoal(userId, { goalMl, date }) {
    await UserSettingsDao.setWater(userId, { waterGoalMl: goalMl });
    return this.day(userId, date ?? todayIn());
  }
}

export default new WaterService();
