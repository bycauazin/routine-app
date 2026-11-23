import logger from "../services/logger.js";
import { AppError, RateLimitError } from "../shared/errors.js";

/** Unknown route → 404 in the standard error shape. */
export function notFoundHandler(_req, res) {
  res.status(404).json({ meta: { success: false }, code: "NOT_FOUND", message: "Rota não encontrada." });
}

/**
 * Global error handler. Response shape:
 *   { meta: { success: false }, code, message, fields? }
 * `fields` lists per-field validation messages (shown next to the inputs).
 * Unknown errors become a generic 500 — internal details are only logged.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const fail = (status, code, message, fields) =>
    res.status(status).json({ meta: { success: false }, code, message, ...(fields ? { fields } : {}) });

  if (err instanceof RateLimitError) res.set("Retry-After", String(err.retryAfterSeconds));
  if (err instanceof AppError) return fail(err.status, err.code, err.message, err.fields);
  if (err?.type === "entity.parse.failed") return fail(400, "BAD_JSON", "JSON inválido.");
  if (err?.type === "entity.too.large") return fail(413, "PAYLOAD_TOO_LARGE", "Requisição muito grande.");

  // Metadata only — never the request body (passwords, amounts).
  logger.error("Unhandled error", { method: req.method, path: req.originalUrl, userId: req.auth?.user?.id, error: err });
  fail(500, "INTERNAL_ERROR", "Erro inesperado. Tente novamente.");
}
