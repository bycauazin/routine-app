/**
 * Domain errors. Services throw these; the error middleware maps them to
 * status codes and safe, user-facing messages (pt-BR). Never put internal
 * details (SQL, stack traces, other users' data) in `message`.
 */
export class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} status
   * @param {Record<string, string>} [fields]
   */
  constructor(code, message, status, fields) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message, fields) {
    super("CONFLICT", message, 409, fields);
  }
}

export class ValidationError extends AppError {
  constructor(message, fields) {
    super("VALIDATION_ERROR", message, 422, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sessão expirada. Faça login novamente.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Operação não permitida.") {
    super("FORBIDDEN", message, 403);
  }
}

export class RateLimitError extends AppError {
  constructor(message, retryAfterSeconds) {
    super("RATE_LIMITED", message, 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** @param {unknown} error */
export function prismaErrorCode(error) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export const isUniqueViolation = (e) => prismaErrorCode(e) === "P2002";
export const isForeignKeyViolation = (e) => prismaErrorCode(e) === "P2003";

/**
 * Generic HTTP error, same contract as Desk-API's StatusError:
 * `throw new StatusError(409, "message")`.
 */
export class StatusError extends AppError {
  constructor(status, message, code = "ERROR") {
    super(code, message, status);
    this.name = "StatusError";
  }
}
