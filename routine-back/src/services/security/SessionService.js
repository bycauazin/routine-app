import { randomBytes } from "node:crypto";
import SessionDao from "../../daos/SessionDao.js";
import { NotFoundError } from "../../shared/errors.js";
import { SESSION_MAX_LIFETIME_DAYS, SESSION_RENEW_THRESHOLD_DAYS, SESSION_TOUCH_MINUTES, SESSION_TTL_DAYS } from "../../shared/constants.js";
import { tokenDigest } from "./secrets.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ id: string, email: string, name: string, role: "ADMIN" | "USER", onboardingCompletedAt: Date | null, twoFactorEnabledAt: Date | null }} SessionUser
 * @typedef {{ sessionId: string, expiresAt: Date, user: SessionUser }} ValidatedSession
 */

/** Last moment a session may exist, whatever its use: SESSION_MAX_LIFETIME_DAYS after sign-in. */
const hardLimit = (createdAt) => createdAt.getTime() + SESSION_MAX_LIFETIME_DAYS * DAY_MS;

class SessionService {
  /** 256 bits of randomness, URL-safe. The raw value only ever lives in the cookie. */
  generateToken() {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Sessions are stored by an HMAC of the token (keyed by AUTH_SECRET), so a
   * database leak does not expose live tokens.
   */
  hashToken(token) {
    return tokenDigest(token);
  }

  /** @param {string} userId @param {{ userAgent?: string | null, ipAddress?: string | null }} [meta] */
  /** `until` shortens the session (a demonstration account ends with it). */
  async create(userId, meta = {}, { until } = {}) {
    const token = this.generateToken();
    const regular = Date.now() + SESSION_TTL_DAYS * DAY_MS;
    const expiresAt = new Date(until ? Math.min(regular, until.getTime()) : regular);
    await SessionDao.create({
      id: this.hashToken(token),
      userId,
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
      ipAddress: meta.ipAddress ?? null,
    });
    return { token, expiresAt };
  }

  /**
   * Validates a raw token against the database on every request. A session
   * ends after SESSION_TTL_DAYS without use, or SESSION_MAX_LIFETIME_DAYS
   * after sign-in even if used every day. Sessions in use are extended up to
   * that hard limit, and their "last access" is kept roughly up to date.
   * @returns {Promise<ValidatedSession | null>}
   */
  async validate(token) {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const sessionId = this.hashToken(token);
    const session = await SessionDao.findWithUser(sessionId);
    if (!session) return null;

    const now = Date.now();
    const limit = hardLimit(session.createdAt);
    if (session.expiresAt.getTime() <= now || limit <= now) {
      await SessionDao.deleteById(sessionId);
      return null;
    }
    let expiresAt = session.expiresAt;
    if (expiresAt.getTime() - now < SESSION_RENEW_THRESHOLD_DAYS * DAY_MS && expiresAt.getTime() < limit) {
      expiresAt = new Date(Math.min(now + SESSION_TTL_DAYS * DAY_MS, limit));
      await SessionDao.extend(sessionId, expiresAt);
    } else if (now - session.lastSeenAt.getTime() > SESSION_TOUCH_MINUTES * 60_000) {
      await SessionDao.touch(sessionId);
    }
    return { sessionId, expiresAt, user: session.user };
  }

  invalidate(sessionId) {
    return SessionDao.deleteById(sessionId);
  }

  /** Signs the user out everywhere, optionally keeping one session. Returns the count. */
  invalidateUser(userId, exceptSessionId) {
    return SessionDao.deleteByUser(userId, exceptSessionId);
  }

  /**
   * The user's signed-in devices. `id` is the stored HMAC (useless to sign in
   * with), used only to end that session.
   */
  async list(userId, currentSessionId) {
    const sessions = await SessionDao.listActiveByUser(userId);
    return sessions.map((s) => ({
      id: s.id,
      current: s.id === currentSessionId,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      userAgent: s.userAgent,
    }));
  }

  /** Ends one of the user's sessions (another device). */
  async revoke(userId, sessionId) {
    if ((await SessionDao.deleteOwned(userId, sessionId)) !== 1) throw new NotFoundError("Sessão não encontrada.");
  }
}

export default new SessionService();
