/**
 * Minimal structured logger (JSON lines). The only place allowed to write to
 * the console. Log metadata only (ids, counts, timings) — never request
 * bodies, passwords, tokens or amounts typed by the user.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === "test" ? LEVELS.error : LEVELS.info);

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, code: err.code, stack: err.stack };
}

function write(level, message, meta = {}) {
  if (LEVELS[level] < minLevel) return;
  const entry = { time: new Date().toISOString(), level, message };
  for (const [key, value] of Object.entries(meta)) entry[key] = serializeError(value);
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

const logger = {
  debug: (message, meta) => write("debug", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};

export default logger;
