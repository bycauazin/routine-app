import { prisma } from "../database/prisma.js";

/**
 * Base for user-owned tables (they all have `user_id` and a composite
 * unique `(id, user_id)`). Every method takes the owner's `userId`, so a
 * record of another user can never be read or changed through a DAO.
 *
 * All methods accept `options = { tx }` to run inside a transaction opened
 * by a Service with `withTransaction`.
 */
export class BaseDao {
  /** @param {string} delegate Prisma model delegate name, e.g. "routineItem" */
  constructor(delegate) {
    this.delegate = delegate;
  }

  /** Prisma client (or transaction client) for this call. */
  db(options = {}) {
    return options.tx ?? prisma;
  }

  /** The model delegate. */
  model(options = {}) {
    return this.db(options)[this.delegate];
  }

  /** Runs `fn(tx)` in a database transaction (all-or-nothing). */
  withTransaction(fn) {
    return prisma.$transaction(fn);
  }

  findOwned(userId, id, options = {}) {
    return this.model(options).findFirst({ where: { id, userId } });
  }

  findAllOwned(userId, args = {}, options = {}) {
    return this.model(options).findMany({ ...args, where: { ...args.where, userId } });
  }

  countOwned(userId, where = {}, options = {}) {
    return this.model(options).count({ where: { ...where, userId } });
  }

  create(userId, data, options = {}) {
    return this.model(options).create({ data: { ...data, userId } });
  }

  /** Update through the composite key: the WHERE clause itself guarantees ownership. */
  updateOwned(userId, id, data, options = {}) {
    return this.model(options).update({ where: { id_userId: { id, userId } }, data });
  }

  updateManyOwned(userId, where, data, options = {}) {
    return this.model(options).updateMany({ where: { ...where, userId }, data });
  }

  deleteOwned(userId, id, options = {}) {
    return this.model(options).delete({ where: { id_userId: { id, userId } } });
  }

  deleteManyOwned(userId, where, options = {}) {
    return this.model(options).deleteMany({ where: { ...where, userId } });
  }
}
