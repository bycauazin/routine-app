/**
 * Domain constants shared by forms, services and DAOs.
 * No imports from other layers, no process.env (see src/shared/README.md).
 */

// ───────────── Auth ─────────────

/** A session unused for this long ends (idle limit). */
export const SESSION_TTL_DAYS = 30;
/** Sessions are extended when less than this many days remain (sliding expiration). */
export const SESSION_RENEW_THRESHOLD_DAYS = 15;
/** No session lives longer than this, even if used every day: then sign in again. */
export const SESSION_MAX_LIFETIME_DAYS = 90;
/** "Last access" of a session is updated at most this often (one write per hour). */
export const SESSION_TOUCH_MINUTES = 60;

/**
 * Demonstration accounts: anyone can open one from the login screen. Each
 * visitor gets their own copy of a fictional person, deleted when they leave
 * or after DEMO_LIFETIME_HOURS. `.invalid` is a reserved domain (no e-mail can
 * reach it) and the password is random, so a demo is never signed in to with
 * a password.
 */
export const DEMO_EMAIL_DOMAIN = "routine.invalid";
export const DEMO_NAME = "Marina Costa";
export const DEMO_LIFETIME_HOURS = 24;
/** Demos alive at once; opening one more removes the oldest. */
export const DEMO_MAX_ACCOUNTS = 30;
/** Demos one IP can open per window. */
export const DEMO_MAX_PER_IP = 6;
export const DEMO_WINDOW_MINUTES = 60;

/** True for the address of a demonstration account. */
export const isDemoEmail = (email) => typeof email === "string" && email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);

/** Requests per client IP per minute across the whole API. */
export const API_RATE_LIMIT_PER_MINUTE = 120;
/** Messages per person per hour the Telegram bot may send to the AI (caps cost); past it, "não entendi". */
export const TELEGRAM_AI_PER_HOUR = 30;

/** Two-step verification. */
export const TWO_FACTOR_LOGIN_TTL_MINUTES = 10;
export const TWO_FACTOR_MAX_FAILURES = 5;
export const TWO_FACTOR_WINDOW_MINUTES = 15;
export const RECOVERY_CODE_COUNT = 10;

/** Login rate limits (failed attempts within the window). */
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILURES_PER_EMAIL = 5;
export const LOGIN_MAX_FAILURES_PER_IP = 30;

export const PASSWORD_MIN_LENGTH = 10;

/** How long each e-mail link works. */
export const EMAIL_VERIFY_TTL_MINUTES = 24 * 60;
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const EMAIL_CHANGE_TTL_MINUTES = 60;

/** Limits for actions that send e-mails or create accounts (per window). */
export const EMAIL_ACTION_WINDOW_MINUTES = 15;
export const EMAIL_ACTION_MAX_PER_ADDRESS = 3;
export const EMAIL_ACTION_MAX_PER_IP = 20;
export const SIGNUP_WINDOW_MINUTES = 60;
export const SIGNUP_MAX_PER_IP = 5;
export const PASSWORD_MAX_LENGTH = 128;

// ───────────── Routine ─────────────

/** Tints of the front (--cat-* tokens) a category may use. Never a hex: the colors live in the front's tokens. */
export const CATEGORY_COLOR_KEYS = ["daily", "work", "commute", "study", "class", "workout", "meal", "personal"];

/** Categories every user starts with (editable). */
export const DEFAULT_CATEGORIES = Object.freeze([
  // Small things done every day, usually without a set time: read 2 pages, review flashcards.
  { name: "Rotina diária", colorKey: "daily", icon: "repeat", sortOrder: 0 },
  { name: "Trabalho", colorKey: "work", icon: "briefcase", sortOrder: 1 },
  { name: "Condução", colorKey: "commute", icon: "bus", sortOrder: 2 },
  { name: "Estudo", colorKey: "study", icon: "book-open", sortOrder: 3 },
  { name: "Aulas", colorKey: "class", icon: "graduation-cap", sortOrder: 4 },
  { name: "Treino", colorKey: "workout", icon: "dumbbell", sortOrder: 5 },
  { name: "Refeição", colorKey: "meal", icon: "utensils", sortOrder: 6 },
  { name: "Pessoal", colorKey: "personal", icon: "sparkles", sortOrder: 7 },
]);

/** Kinds a fixed rule may have now (HABIT comes in stage 3, CLASS in stage 4). */
/** Every fixed item is a block of the routine (with optional steps). */
export const RULE_KINDS = ["ROUTINE"];
/** Kinds that can be added just for one day. */
export const ONE_OFF_KINDS = ["TASK", "APPOINTMENT"];
/** Parts of the day (enum DayPeriod) and office/home (enum WorkMode). */
export const DAY_PERIODS = ["MORNING", "AFTERNOON", "EVENING"];
export const WORK_MODES = ["OFFICE", "HOME"];
/** Workout types a user may list in settings. */
export const MAX_WORKOUT_TYPES = 12;
/** "Atrasar": the largest move at once, in minutes. */
export const SHIFT_MINUTES_MAX = 720;
