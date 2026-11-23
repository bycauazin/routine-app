import { randomBytes } from "node:crypto";
import UserDao from "../daos/UserDao.js";
import { DEMO_EMAIL_DOMAIN, DEMO_LIFETIME_HOURS, DEMO_MAX_ACCOUNTS, DEMO_NAME } from "../shared/constants.js";
import logger from "./logger.js";
import UserService from "./UserService.js";

/** How many weeks of history the demo person has before today. */
const HISTORY_WEEKS = 3;

/**
 * Demonstration accounts: a fictional person with a few weeks of routine, so
 * anyone can try the app from the login screen without signing up. Each
 * visitor gets their own copy (nobody sees what another visitor typed), built
 * through the same services as the real app so every rule holds. A copy is
 * deleted when the visitor leaves it or after DEMO_LIFETIME_HOURS.
 *
 * The routine itself (fixed blocks, habits, classes…) is added stage by stage,
 * as each part of the app exists.
 */
class DemoService {
  isDemo(user) {
    return Boolean(user?.demoExpiresAt);
  }

  /** Deletes the demo if `user` is one (leaving it: nothing of it is kept). */
  async discard(user) {
    if (!this.isDemo(user)) return;
    await UserDao.deleteById(user.id).catch(() => {}); // already gone: fine
  }

  /** Builds a new demo account. Returns `{ userId, expiresAt }`. */
  async create() {
    const started = Date.now();
    const pruned = await UserDao.pruneDemos(DEMO_MAX_ACCOUNTS - 1);
    if (pruned) logger.info("Old demo accounts removed", { count: pruned });
    const expiresAt = new Date(Date.now() + DEMO_LIFETIME_HOURS * 3_600_000);
    const email = `demo-${randomBytes(9).toString("base64url").toLowerCase()}@${DEMO_EMAIL_DOMAIN}`;
    try {
      const userId = await this.build(email, expiresAt);
      logger.info("Demo account created", { ms: Date.now() - started });
      return { userId, expiresAt };
    } catch (error) {
      // Half-built: remove it rather than leave a broken demo behind.
      const partial = await UserDao.findByEmail(email).catch(() => null);
      if (partial) await UserDao.deleteById(partial.id).catch(() => {});
      throw error;
    }
  }

  /** The fictional person. Returns the user id. */
  async build(email, expiresAt) {
    const { id: userId } = await UserService.create({ email, name: DEMO_NAME, password: randomBytes(32).toString("base64url"), demoExpiresAt: expiresAt });
    // Started using the app a few weeks ago (reports begin there), onboarding done.
    const startedAt = new Date(Date.now() - HISTORY_WEEKS * 7 * 86_400_000);
    await UserDao.updateById(userId, { createdAt: startedAt, onboardingCompletedAt: new Date() });
    return userId;
  }
}

export default new DemoService();
