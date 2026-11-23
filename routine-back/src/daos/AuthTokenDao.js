import { prisma } from "../database/prisma.js";

/** One-time e-mail link tokens, stored by HMAC. Looked up by token, not by owner. */
class AuthTokenDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  create(data, options = {}) {
    return this.db(options).authToken.create({ data });
  }

  findById(id, options = {}) {
    return this.db(options).authToken.findUnique({ where: { id } });
  }

  /** Returns how many rows were deleted (1 = this call used the token). */
  async deleteById(id, options = {}) {
    const { count } = await this.db(options).authToken.deleteMany({ where: { id } });
    return count;
  }

  deleteByUser(userId, purpose, options = {}) {
    return this.db(options).authToken.deleteMany({ where: { userId, ...(purpose ? { purpose } : {}) } });
  }

  deleteExpired(options = {}) {
    return this.db(options).authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}

export default new AuthTokenDao();
