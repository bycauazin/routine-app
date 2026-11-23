import logger from "../services/logger.js";

/**
 * Base of every controller (Desk-API pattern). Controllers are thin: each
 * method returns an Express handler `(req, res) => {}` that reads
 * `req.validated`, calls one Service method and answers.
 *
 * Express 5 forwards rejected promises to the error middleware, so handlers
 * do not need try/catch — just let errors throw.
 */
export class BaseController {
  constructor() {
    this._logger = logger;
  }

  /** Authenticated user id (routes guarantee `requireAuth` ran first). */
  userId(req) {
    return req.auth.user.id;
  }

  /** `{ meta: { success: true, ...meta }, data }` */
  ok(res, data, meta = {}, status = 200) {
    return res.status(status).json({ meta: { success: true, ...meta }, data });
  }

  created(res, data, meta = {}) {
    return this.ok(res, data, meta, 201);
  }

  noContent(res) {
    return res.status(204).end();
  }
}
