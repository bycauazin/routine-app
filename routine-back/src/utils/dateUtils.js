/**
 * Civil-date helpers.
 *
 * Competence dates, due dates and reference dates are *calendar days*, not
 * instants. They are represented as "YYYY-MM-DD" strings in the app and as
 * Postgres `date` in the database, so they never shift with time zones.
 * "Today" is always resolved in the user's time zone (default America/Sao_Paulo).
 *
 * @typedef {string} CivilDate  "YYYY-MM-DD"
 * @typedef {string} YearMonth  "YYYY-MM"
 */

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

const CIVIL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** @param {string} value */
export function isCivilDate(value) {
  const match = CIVIL_DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** @param {CivilDate} value */
export function parseCivilDate(value) {
  if (!isCivilDate(value)) throw new RangeError(`Invalid civil date: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** @returns {CivilDate} */
export function toCivilDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Number of days in a month (month is 1–12). Handles leap years. */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Today's calendar date in the given time zone.
 * @returns {CivilDate}
 */
export function todayIn(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Adds calendar months, clamping the day to the target month's length:
 * 2025-01-31 + 1 month → 2025-02-28. Never "adds 30 days".
 * @param {CivilDate} date
 * @param {number} months
 * @returns {CivilDate}
 */
export function addMonths(date, months) {
  const { year, month, day } = parseCivilDate(date);
  const zeroBased = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased - targetYear * 12) + 1;
  return toCivilDate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/**
 * @param {CivilDate} date
 * @param {number} days
 * @returns {CivilDate}
 */
export function addDays(date, days) {
  const { year, month, day } = parseCivilDate(date);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return toCivilDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** The date in a given month with the requested day, clamped (day 31 in Feb → 28/29). */
export function dateInMonth(year, month, day) {
  return toCivilDate(year, month, Math.min(day, daysInMonth(year, month)));
}

/** @param {CivilDate} a @param {CivilDate} b */
export function compareCivilDates(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** @param {CivilDate} date @returns {YearMonth} */
export function yearMonthOf(date) {
  return date.slice(0, 7);
}

/** @param {YearMonth} ym @param {number} months @returns {YearMonth} */
export function addMonthsToYearMonth(ym, months) {
  return addMonths(`${ym}-01`, months).slice(0, 7);
}

/**
 * Converts a civil date to the JS Date Prisma expects for a `@db.Date` column.
 * @param {CivilDate} date
 */
export function civilDateToDb(date) {
  parseCivilDate(date);
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Converts a `@db.Date` value read by Prisma back into a civil date.
 * @param {Date} date
 * @returns {CivilDate}
 */
export function dbToCivilDate(date) {
  return date.toISOString().slice(0, 10);
}

const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

/** "YYYY-MM" between 2000-01 and 2100-12. @param {string} value */
export function isYearMonth(value) {
  const match = YEAR_MONTH_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

/** Current month ("YYYY-MM") in the given time zone. */
export function currentYearMonth(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
  return todayIn(timeZone, now).slice(0, 7);
}

/** "2025-03" → Date for 2025-03-01 (Prisma `@db.Date`). @param {YearMonth} ym */
export function yearMonthToDb(ym) {
  return civilDateToDb(`${ym}-01`);
}

/** Date from a `@db.Date` month column → "YYYY-MM". @param {Date} date */
export function dbToYearMonth(date) {
  return dbToCivilDate(date).slice(0, 7);
}

/** Due date of a monthly item: the given day clamped to the month (31 → 28/29/30). */
export function dueDateIn(ym, dayOfMonth) {
  const [year, month] = ym.split("-").map(Number);
  return dateInMonth(year, month, dayOfMonth);
}

/** Inclusive list of months from `from` to `to`. */
export function monthRange(from, to) {
  const months = [];
  for (let ym = from; ym <= to; ym = addMonthsToYearMonth(ym, 1)) months.push(ym);
  return months;
}

/** Whole months from `a` to `b` ("2026-01" → "2026-03" = 2). @param {YearMonth} a @param {YearMonth} b */
export function monthsBetween(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}
