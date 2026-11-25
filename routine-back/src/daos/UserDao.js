import { prisma } from "../database/prisma.js";
import { DEFAULT_CATEGORIES } from "../shared/constants.js";

/** Users. Not user-owned (it *is* the owner), so it does not extend BaseDao. */
class UserDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  count(args = {}, options = {}) {
    return this.db(options).user.count(args);
  }

  findById(id, options = {}) {
    return this.db(options).user.findUnique({ where: { id } });
  }

  /** Includes `passwordHash` — use only for authentication. */
  findByEmail(email, options = {}) {
    return this.db(options).user.findUnique({ where: { email } });
  }

  /** Creates the user together with default settings. */
  createWithSettings(data, options = {}) {
    return this.db(options).user.create({ data: { ...data, settings: { create: {} }, categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c })) } } });
  }

  updateById(id, data, options = {}) {
    return this.db(options).user.update({ where: { id }, data });
  }

  /**
   * Accepts a two-step code only if its time step is newer than the last one
   * used (a code never works twice, even in two requests at once).
   * @returns {Promise<boolean>}
   */
  async advanceTwoFactorStep(id, step, options = {}) {
    const { count } = await this.db(options).user.updateMany({
      where: { id, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    return count === 1;
  }

  /** Deletes the user; every table they own goes with it (ON DELETE CASCADE). */
  deleteById(id, options = {}) {
    return this.db(options).user.delete({ where: { id } });
  }

  // ───── Admin ─────

  /** Real accounts (no demos), waiting for approval first, then newest. No secrets. */
  listReal(options = {}) {
    return this.db(options).user.findMany({
      where: { demoExpiresAt: null },
      orderBy: [{ approvedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      select: { id: true, name: true, email: true, role: true, createdAt: true, emailVerifiedAt: true, approvedAt: true, twoFactorEnabledAt: true },
    });
  }

  /** Admins who get the "someone is waiting for approval" e-mail. */
  listAdmins(options = {}) {
    return this.db(options).user.findMany({ where: { role: "ADMIN", demoExpiresAt: null, approvedAt: { not: null } }, select: { email: true, name: true } });
  }

  /** Lets a waiting account in. Returns null when it does not exist or was already approved. */
  async approve(id, options = {}) {
    const { count } = await this.db(options).user.updateMany({ where: { id, approvedAt: null, demoExpiresAt: null }, data: { approvedAt: new Date() } });
    return count === 1 ? this.findById(id, options) : null;
  }

  // ───── Demonstration accounts ─────

  /** Removes demos past their time, then the oldest ones beyond `keep`. Returns how many went. */
  async pruneDemos(keep, options = {}) {
    const db = this.db(options);
    const expired = await db.user.deleteMany({ where: { demoExpiresAt: { lte: new Date() } } });
    const extra = await db.user.findMany({ where: { demoExpiresAt: { not: null } }, orderBy: { demoExpiresAt: "desc" }, skip: keep, select: { id: true } });
    const over = extra.length ? await db.user.deleteMany({ where: { id: { in: extra.map((u) => u.id) } } }) : { count: 0 };
    return expired.count + over.count;
  }
}

export default new UserDao();
