import { prisma } from "../database/prisma.js";

/** Per-minute request counters for the API-wide rate limit. */
class RequestCounterDao {
  /** Adds one request to the bucket's window and returns the new total (one query, safe under concurrency). */
  async increment(bucket, windowStart) {
    const rows = await prisma.$queryRaw`
      INSERT INTO request_counters (bucket, window_start, count) VALUES (${bucket}, ${windowStart}, 1)
      ON CONFLICT (bucket, window_start) DO UPDATE SET count = request_counters.count + 1
      RETURNING count`;
    return rows[0].count;
  }

  deleteOlderThan(date) {
    return prisma.requestCounter.deleteMany({ where: { windowStart: { lt: date } } });
  }
}

export default new RequestCounterDao();
