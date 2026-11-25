/**
 * Times of day travel as minutes since 00:00 (the API's format). These only
 * format and read them; every rule about them lives in the backend.
 */
import { TIME_ZONE } from "./dates";

/** 420 → "07:00"; 1440 → "00:00" (midnight that ends the day). */
export function formatMinute(minute) {
  if (minute === null || minute === undefined) return "";
  const m = minute % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "07:00–08:00", "07:00" (no end) or "" (no time). */
export function formatRange(start, end) {
  if (start === null || start === undefined) return "";
  return end === null || end === undefined ? formatMinute(start) : `${formatMinute(start)}–${formatMinute(end)}`;
}

/**
 * "HH:MM" from an <input type="time"> → minutes, or null when empty.
 * As an END time, "00:00" means midnight at the end of the day (1440).
 */
export function parseTime(value, { end = false } = {}) {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return end && minutes === 0 ? 1440 : minutes;
}

/** Minutes since 00:00 right now in São Paulo. */
export function nowMinute(timeZone = TIME_ZONE, now = new Date()) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now).split(":").map(Number);
  return (h % 24) * 60 + m;
}

/** Parts of the day (the API's DayPeriod), with their hours: the same as the backend's PERIODS. */
export const PERIODS = {
  MORNING: { label: "Manhã", start: 360, end: 720 },
  AFTERNOON: { label: "Tarde", start: 720, end: 1080 },
  EVENING: { label: "Noite", start: 1080, end: 1440 },
};

/** Where an item sits in the day: its start, or the start of its period; null = no time. */
export function sortMinute(item) {
  if (item.startMinute !== null && item.startMinute !== undefined) return item.startMinute;
  return item.period ? PERIODS[item.period].start : null;
}

/** "07:00–08:00", "Manhã" or "" for an item. */
export function itemTime(item) {
  return item.period ? PERIODS[item.period].label : formatRange(item.startMinute, item.endMinute);
}

/** Form values of an item's time (from an item or rule, or empty). */
export function timeValues(item, fallback = "none") {
  const exact = item?.startMinute !== null && item?.startMinute !== undefined;
  return {
    timeMode: item?.period ? "period" : exact ? "exact" : item ? "none" : fallback,
    period: item?.period ?? "MORNING",
    start: formatMinute(item?.startMinute),
    end: formatMinute(item?.endMinute),
  };
}

/** The API fields for those values: exact times, a period, or neither. */
export function timeBody(values) {
  if (values.timeMode === "period") return { startMinute: null, endMinute: null, period: values.period };
  const startMinute = values.timeMode === "exact" ? parseTime(values.start) : null;
  return { startMinute, endMinute: startMinute === null ? null : parseTime(values.end, { end: true }), period: null };
}
