import { prisma } from "./prisma.js";

/**
 * Runs `fn(tx)` inside a database transaction: everything commits together
 * or nothing does. Services pass `{ tx }` to every DAO call made inside.
 * @template T
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function withTransaction(fn) {
  return prisma.$transaction(fn);
}
