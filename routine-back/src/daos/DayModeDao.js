import { civilDateToDb } from "../utils/dateUtils.js";
import { BaseDao } from "./BaseDao.js";

/** Days switched between office and home ("Hoje é home"). */
class DayModeDao extends BaseDao {
  constructor() {
    super("dayMode");
  }

  between(userId, from, to, options = {}) {
    return this.model(options).findMany({ where: { userId, date: { gte: civilDateToDb(from), lte: civilDateToDb(to) } } });
  }

  set(userId, date, mode, options = {}) {
    const day = civilDateToDb(date);
    return this.model(options).upsert({ where: { userId_date: { userId, date: day } }, create: { userId, date: day, mode }, update: { mode } });
  }

  clear(userId, date, options = {}) {
    return this.model(options).deleteMany({ where: { userId, date: civilDateToDb(date) } });
  }
}

export default new DayModeDao();
