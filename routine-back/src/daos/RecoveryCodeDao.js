import { prisma } from "../database/prisma.js";

/** Two-step verification recovery codes, stored by HMAC. */
class RecoveryCodeDao {
  db(options = {}) {
    return options.tx ?? prisma;
  }

  /** Replaces every code of the user with new ones (`ids` are the HMACs). */
  async replaceAll(userId, ids, options = {}) {
    await this.db(options).recoveryCode.deleteMany({ where: { userId } });
    await this.db(options).recoveryCode.createMany({ data: ids.map((id) => ({ id, userId })) });
  }

  /** Uses a code: returns true only for the request that deleted it. */
  async consume(userId, id, options = {}) {
    const { count } = await this.db(options).recoveryCode.deleteMany({ where: { id, userId } });
    return count === 1;
  }

  countByUser(userId, options = {}) {
    return this.db(options).recoveryCode.count({ where: { userId } });
  }

  deleteByUser(userId, options = {}) {
    return this.db(options).recoveryCode.deleteMany({ where: { userId } });
  }
}

export default new RecoveryCodeDao();
