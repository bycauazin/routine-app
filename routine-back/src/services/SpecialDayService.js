import { prisma } from "../database/prisma.js";
import DayItemDao, { UNTOUCHED } from "../daos/DayItemDao.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { addDays, civilDateToDb, dbToCivilDate } from "../utils/dateUtils.js";
import { datesBetween } from "../utils/routineUtils.js";

const MAX_DAYS = 366;
export const SPECIAL_KINDS = ["HOLIDAY", "VACATION", "SICK"];

/**
 * Dias especiais: feriado, férias (a period) and doente. On those days the
 * fixed items marked "pula em dias especiais" (rule.skipOnHolidays) do not
 * happen; the others (Rotina diária, Rotina de dormir…) still do, and if they
 * are not done the reports point it out.
 */
class SpecialDayService {
  dto(s) {
    return { id: s.id, kind: s.kind, from: dbToCivilDate(s.fromDate), to: dbToCivilDate(s.toDate), name: s.name };
  }

  async list(userId, { from, to } = {}) {
    const where = { userId, ...(to ? { fromDate: { lte: civilDateToDb(to) } } : {}), ...(from ? { toDate: { gte: civilDateToDb(from) } } : {}) };
    const rows = await prisma.specialDay.findMany({ where, orderBy: { fromDate: "asc" } });
    return rows.map((s) => this.dto(s));
  }

  /** Special day of each date of `from`…`to`: Map date → { id, kind, name }. */
  async map(userId, from, to, options = {}) {
    const db = options.tx ?? prisma;
    const rows = await db.specialDay.findMany({ where: { userId, fromDate: { lte: civilDateToDb(to) }, toDate: { gte: civilDateToDb(from) } }, orderBy: { createdAt: "asc" } });
    const out = new Map();
    for (const s of rows) {
      const a = dbToCivilDate(s.fromDate) > from ? dbToCivilDate(s.fromDate) : from;
      const b = dbToCivilDate(s.toDate) < to ? dbToCivilDate(s.toDate) : to;
      for (const date of datesBetween(a, b)) out.set(date, { id: s.id, kind: s.kind, name: s.name });
    }
    return out;
  }

  /** Marks the days; untouched items of fixed items that skip special days leave those days. */
  async create(userId, { kind, from, to, name }) {
    const end = to ?? from;
    if (end < from) throw new ValidationError("O fim precisa ser depois do início.", { to: "O fim precisa ser depois do início." });
    if (datesBetween(from, end).length > MAX_DAYS) throw new ValidationError("Use no máximo um ano.", { to: "Use no máximo um ano." });
    return prisma.$transaction(async (tx) => {
      const row = await tx.specialDay.create({ data: { userId, kind, fromDate: civilDateToDb(from), toDate: civilDateToDb(end), name: name?.trim() || null } });
      await DayItemDao.deleteManyOwned(userId, { ...UNTOUCHED, ruleId: { not: null }, rule: { skipOnHolidays: true }, date: { gte: civilDateToDb(from), lte: civilDateToDb(end) } }, { tx });
      return this.dto(row);
    });
  }

  /** Unmarks: the days are made again the next time they are opened. */
  async remove(userId, id) {
    const row = await prisma.specialDay.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundError("Dia especial não encontrado.");
    await prisma.specialDay.delete({ where: { id } });
    return { from: dbToCivilDate(row.fromDate), to: dbToCivilDate(row.toDate) };
  }
}

export const nextDay = (date) => addDays(date, 1);
export default new SpecialDayService();
