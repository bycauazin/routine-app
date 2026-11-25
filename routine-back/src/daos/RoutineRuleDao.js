import { civilDateToDb } from "../utils/dateUtils.js";
import { BaseDao } from "./BaseDao.js";

class RoutineRuleDao extends BaseDao {
  constructor() {
    super("routineRule");
  }

  /** Rules that may make items between `from` and `to` (both civil dates). */
  activeBetween(userId, from, to, options = {}) {
    return this.model(options).findMany({
      where: { userId, startDate: { lte: civilDateToDb(to) }, OR: [{ endDate: null }, { endDate: { gte: civilDateToDb(from) } }] },
    });
  }
}

export default new RoutineRuleDao();
