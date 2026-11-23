import { env } from "../config/env.js";
import { AppError, ForbiddenError } from "../shared/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF protection for cookie-authenticated requests:
 * 1. mutating requests must come from the app's own origin (Origin header);
 * 2. requests with a body must be JSON, which plain HTML forms cannot send.
 * Together with SameSite=Lax cookies, this blocks cross-site forgery.
 */
export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get("origin") !== env.APP_ORIGIN) {
    return next(new ForbiddenError("Origem da requisição não permitida."));
  }
  const hasBody = Number(req.get("content-length") ?? 0) > 0 || req.get("transfer-encoding");
  if (hasBody && !req.is("application/json")) {
    return next(new AppError("UNSUPPORTED_MEDIA_TYPE", "Envie os dados em JSON.", 415));
  }
  next();
}
