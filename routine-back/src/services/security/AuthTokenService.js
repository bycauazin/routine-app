import { randomBytes } from "node:crypto";
import AuthTokenDao from "../../daos/AuthTokenDao.js";
import { AppError } from "../../shared/errors.js";
import { tokenDigest } from "./secrets.js";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const invalidLink = () => new AppError("INVALID_TOKEN", "Este link é inválido ou expirou. Peça um novo.", 400);

/**
 * One-time tokens for e-mail links (confirm account, reset password, confirm
 * a new e-mail). The raw token only exists in the e-mail; the database keeps
 * its HMAC. Asking for a new link cancels the previous one.
 */
class AuthTokenService {
  /**
   * @param {string} userId
   * @param {"EMAIL_VERIFY" | "PASSWORD_RESET" | "EMAIL_CHANGE" | "TWO_FACTOR_LOGIN"} purpose
   * @param {number} ttlMinutes
   * @param {{ newEmail?: string | null }} [extra]
   * @returns {Promise<string>} the raw token, to put in the link
   */
  async issue(userId, purpose, ttlMinutes, { newEmail = null } = {}, options = {}) {
    await AuthTokenDao.deleteByUser(userId, purpose, options);
    // Housekeeping: expired tokens are useless.
    if (Math.random() < 0.1) await AuthTokenDao.deleteExpired(options);
    const token = randomBytes(32).toString("base64url");
    await AuthTokenDao.create({ id: tokenDigest(token), userId, purpose, newEmail, expiresAt: new Date(Date.now() + ttlMinutes * 60_000) }, options);
    return token;
  }

  /**
   * Uses a token exactly once. Throws the same error for unknown, expired,
   * already used or wrong-purpose tokens. Run inside the transaction that
   * applies the change, so a failure gives the token back.
   */
  async consume(token, purpose, options = {}) {
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) throw invalidLink();
    const id = tokenDigest(token);
    const record = await AuthTokenDao.findById(id, options);
    if (!record || record.purpose !== purpose) throw invalidLink();
    // The delete decides who used it when two requests race.
    if ((await AuthTokenDao.deleteById(id, options)) !== 1) throw invalidLink();
    if (record.expiresAt.getTime() <= Date.now()) throw invalidLink();
    return record;
  }

  /**
   * Reads a token without using it up (the two-step login ticket survives a
   * mistyped code). Throws `error()` for unknown, expired or wrong-purpose tokens.
   */
  async peek(token, purpose, error = invalidLink, options = {}) {
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) throw error();
    const record = await AuthTokenDao.findById(tokenDigest(token), options);
    if (!record || record.purpose !== purpose || record.expiresAt.getTime() <= Date.now()) throw error();
    return record;
  }

  /** Cancels every pending link of a user (or of one purpose). */
  revokeAll(userId, purpose, options = {}) {
    return AuthTokenDao.deleteByUser(userId, purpose, options);
  }
}

export default new AuthTokenService();
