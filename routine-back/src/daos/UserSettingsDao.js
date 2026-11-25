import { prisma } from "../database/prisma.js";

const routineFields = { officeDays: true, workoutTypes: true };

/** The user's settings row (one per user, created with the account). */
class UserSettingsDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  /** Office days and workout types (the routine's settings). */
  routine(userId, options = {}) {
    return this.db(options).userSettings.findUnique({ where: { userId }, select: routineFields });
  }

  /** The water goal (stage 4). */
  water(userId, options = {}) {
    return this.db(options).userSettings.findUnique({ where: { userId }, select: { waterGoalMl: true } });
  }

  setWater(userId, data, options = {}) {
    return this.db(options).userSettings.update({ where: { userId }, data, select: { waterGoalMl: true } });
  }

  updateRoutine(userId, data, options = {}) {
    return this.db(options).userSettings.update({ where: { userId }, data, select: routineFields });
  }
}

export default new UserSettingsDao();
