import LoginAttemptDao from "../../daos/LoginAttemptDao.js";
import { RateLimitError } from "../../shared/errors.js";

/**
 * Counts actions per key in a time window (sign-up per IP, e-mails per
 * address, wrong two-step codes…). Uses the login_attempts table with a
 * prefixed identifier such as "register-ip:1.2.3.4", so nothing new needs
 * cleaning up.
 */
class RateLimitService {
  /** Throws 429 when `key` already reached `max` in the window (records nothing). */
  async check(key, max, windowMinutes, message = `Muitas tentativas. Aguarde ${windowMinutes} minutos e tente novamente.`) {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    if ((await LoginAttemptDao.countFailuresByIdentifier(key, since)) >= max) {
      throw new RateLimitError(message, windowMinutes * 60);
    }
  }

  /** Counts one action for `key`. */
  record(key) {
    return LoginAttemptDao.create({ identifier: key, ipAddress: null, success: false });
  }

  /**
   * Records one action for `key`, or throws 429 when the limit was reached.
   * @param {string} key @param {number} max @param {number} windowMinutes
   */
  async hit(key, max, windowMinutes, message) {
    await this.check(key, max, windowMinutes, message);
    await this.record(key);
  }
}

export default new RateLimitService();
