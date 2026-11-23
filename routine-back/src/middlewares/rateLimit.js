import { env } from "../config/env.js";
import RequestCounterDao from "../daos/RequestCounterDao.js";
import { API_RATE_LIMIT_PER_MINUTE } from "../shared/constants.js";
import { RateLimitError } from "../shared/errors.js";
import { keepAlive } from "../utils/keepAlive.js";

/**
 * Settings of the API-wide limit. Off in the test suite (hundreds of requests
 * from one address); the rate-limit test turns it on and lowers the limit.
 */
export const apiRateLimitSettings = { enabled: !env.isTest, perMinute: API_RATE_LIMIT_PER_MINUTE };

/**
 * Caps requests per client IP per minute across the whole API, counted in the
 * database so every serverless instance shares the same count. Normal use
 * (a page loads a handful of requests) stays far below the limit; scripts
 * hammering the API get 429 until the minute ends.
 */
export async function apiRateLimit(req, res, next) {
  if (!apiRateLimitSettings.enabled) return next();
  const now = Date.now();
  const windowStart = new Date(now - (now % 60_000));
  const count = await RequestCounterDao.increment(`ip:${req.ip ?? "unknown"}`, windowStart);
  // Housekeeping: counters older than an hour are useless.
  if (Math.random() < 0.01) keepAlive(RequestCounterDao.deleteOlderThan(new Date(now - 3_600_000)).catch(() => {}));

  const limit = apiRateLimitSettings.perMinute;
  res.set("RateLimit-Limit", String(limit));
  res.set("RateLimit-Remaining", String(Math.max(0, limit - count)));
  if (count > limit) {
    return next(new RateLimitError("Muitas requisições seguidas. Aguarde um minuto e tente de novo.", Math.ceil((windowStart.getTime() + 60_000 - now) / 1000)));
  }
  next();
}
