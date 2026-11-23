import { prisma } from "../database/prisma.js";

const SESSION_USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  onboardingCompletedAt: true,
  twoFactorEnabledAt: true,
  createdAt: true,
  demoExpiresAt: true,
};

/** Server-side sessions, stored by token hash. */
class SessionDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  create(data, options = {}) {
    return this.db(options).session.create({ data });
  }

  /** Session with the safe user fields (never the password hash). */
  findWithUser(id, options = {}) {
    return this.db(options).session.findUnique({
      where: { id },
      select: { id: true, expiresAt: true, createdAt: true, lastSeenAt: true, user: { select: SESSION_USER_FIELDS } },
    });
  }

  extend(id, expiresAt, options = {}) {
    return this.db(options).session.update({ where: { id }, data: { expiresAt, lastSeenAt: new Date() } });
  }

  touch(id, options = {}) {
    return this.db(options).session.updateMany({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  /** The user's signed-in devices that have not expired, most recent first. */
  listActiveByUser(userId, options = {}) {
    return this.db(options).session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  deleteById(id, options = {}) {
    return this.db(options).session.deleteMany({ where: { id } });
  }

  /** Deletes one session only if it belongs to the user. Returns the count (0 or 1). */
  async deleteOwned(userId, id, options = {}) {
    const { count } = await this.db(options).session.deleteMany({ where: { id, userId } });
    return count;
  }

  /** Deletes all sessions of a user, optionally keeping one. Returns the count. */
  async deleteByUser(userId, exceptId, options = {}) {
    const { count } = await this.db(options).session.deleteMany({
      where: { userId, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count;
  }
}

export default new SessionDao();
