import { civilDateToDb } from "../utils/dateUtils.js";
import { BaseDao } from "./BaseDao.js";

/** Water logs ("bebi 300"), one row per time. */
class WaterLogDao extends BaseDao {
  constructor() {
    super("waterLog");
  }

  onDate(userId, date, options = {}) {
    return this.model(options).findMany({ where: { userId, date: civilDateToDb(date) }, orderBy: { loggedAt: "asc" } });
  }

  /** Total per day from `from` on (all days when null), for the streak. */
  totalsSince(userId, from, options = {}) {
    return this.model(options).groupBy({
      by: ["date"],
      where: { userId, ...(from ? { date: { gte: civilDateToDb(from) } } : {}) },
      _sum: { amountMl: true },
      orderBy: { date: "asc" },
    });
  }

  totalsBetween(userId, from, to, options = {}) {
    return this.model(options).groupBy({
      by: ["date"],
      where: { userId, date: { gte: civilDateToDb(from), lte: civilDateToDb(to) } },
      _sum: { amountMl: true },
    });
  }

  lastOn(userId, date, options = {}) {
    return this.model(options).findFirst({ where: { userId, date: civilDateToDb(date) }, orderBy: { loggedAt: "desc" } });
  }
}

export default new WaterLogDao();
