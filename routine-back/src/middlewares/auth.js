import { SESSION_COOKIE } from "../config/session.js";
import SessionService from "../services/security/SessionService.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../shared/errors.js";

/**
 * Loads the session from the cookie (if any) into `req.auth`
 * (`{ sessionId, expiresAt, user }` or null). Never rejects by itself.
 * A demonstration account past its time no longer counts as signed in (it
 * is deleted the next time someone opens a demo).
 */
export async function loadSession(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const auth = token ? await SessionService.validate(token) : null;
  const demoOver = auth?.user.demoExpiresAt && auth.user.demoExpiresAt <= new Date();
  req.auth = demoOver ? null : auth;
  next();
}

/** Rejects requests without a valid session (401). First step of every private route. */
export function requireAuth(req, _res, next) {
  if (!req.auth) return next(new UnauthorizedError());
  next();
}

/** Admins only (after requireAuth). Others get 404: the route's existence is not revealed. */
export function requireAdmin(req, _res, next) {
  if (req.auth?.user.role !== "ADMIN") return next(new NotFoundError("Rota não encontrada."));
  next();
}

/** Account settings that make no sense in the demonstration account (password, e-mail, 2FA, deleting it). */
export function blockDemo(req, _res, next) {
  if (req.auth?.user.demoExpiresAt) return next(new ForbiddenError("Isso não está disponível na conta de demonstração."));
  next();
}
