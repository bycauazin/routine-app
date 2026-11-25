import DayItemDao from "../daos/DayItemDao.js";
import UserSettingsDao from "../daos/UserSettingsDao.js";
import { withTransaction } from "../database/transaction.js";
import { dbToCivilDate, todayIn } from "../utils/dateUtils.js";
import { changeOfficeDays, normalizeWeekdays, officeWeekdaysOn } from "../utils/routineUtils.js";
import DayService from "./DayService.js";

/** Names trimmed, empty ones dropped, repeats (ignoring case) removed, in the order given. */
function uniqueNames(names) {
  const seen = new Set();
  return names
    .map((n) => n.trim())
    .filter((n) => {
      const key = n.toLocaleLowerCase("pt-BR");
      if (!n || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * The routine's settings: office days (the others are home days) and the
 * workout types offered when a workout is marked done.
 */
class RoutineSettingsService {
  dto(settings) {
    return { officeWeekdays: officeWeekdaysOn(settings.officeDays, todayIn()), workoutTypes: settings.workoutTypes };
  }

  async get(userId) {
    return this.dto(await UserSettingsDao.routine(userId));
  }

  /**
   * New office days apply from `from` on (default today), like a fixed item
   * changed "daqui pra frente": the days before keep theirs. Days already
   * opened from then on are remade (untouched office/home items follow).
   */
  async update(userId, input, { from = todayIn() } = {}) {
    return withTransaction(async (tx) => {
      const before = await UserSettingsDao.routine(userId, { tx });
      const data = {};
      if (input.officeWeekdays) data.officeDays = changeOfficeDays(before.officeDays, from, normalizeWeekdays(input.officeWeekdays));
      if (input.workoutTypes) data.workoutTypes = uniqueNames(input.workoutTypes);
      const settings = await UserSettingsDao.updateRoutine(userId, data, { tx });
      if (data.officeDays && JSON.stringify(data.officeDays) !== JSON.stringify(before.officeDays)) {
        const last = await DayItemDao.lastDate(userId, { tx });
        if (last && dbToCivilDate(last) >= from) await DayService.redo(userId, from, dbToCivilDate(last), { tx });
      }
      return this.dto(settings);
    });
  }
}

export default new RoutineSettingsService();
