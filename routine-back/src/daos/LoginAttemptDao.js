import { prisma } from "../database/prisma.js";

/** Login attempts used for rate limiting. */
class LoginAttemptDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  create({ identifier, ipAddress, success }, options = {}) {
    return this.db(options).loginAttempt.create({ data: { identifier, ipAddress, success } });
  }

  countFailuresByIdentifier(identifier, since, options = {}) {
    return this.db(options).loginAttempt.count({ where: { identifier, success: false, createdAt: { gte: since } } });
  }

  countFailuresByIp(ipAddress, since, options = {}) {
    return this.db(options).loginAttempt.count({ where: { ipAddress, success: false, createdAt: { gte: since } } });
  }

  deleteOlderThan(date, options = {}) {
    return this.db(options).loginAttempt.deleteMany({ where: { createdAt: { lt: date } } });
  }
}

export default new LoginAttemptDao();
