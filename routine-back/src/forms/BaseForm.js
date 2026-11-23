import { NotFoundError, ValidationError } from "../shared/errors.js";

/**
 * Base of every Form (same contract as Desk-API's BaseForm):
 * - subclasses implement `static get schemas()` returning Zod schemas for
 *   `{ params?, query?, body? }`;
 * - routes chain `XForm.validate`, which parses the request and sets
 *   `req.validated = { params, query, body }`;
 * - on failure it calls `next(err)` with a 422 carrying per-field messages.
 * Invalid route `params` (ids, months in the path) become 404: the caller
 * learns nothing about which ids exist.
 */
export class BaseForm {
  static get schemas() {
    throw new Error("Forms must implement `static get schemas()`.");
  }

  static get validate() {
    const schemas = this.schemas;
    return (req, _res, next) => {
      const validated = {};

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) return next(new NotFoundError());
        validated.params = result.data;
      }

      const fields = {};
      for (const part of ["query", "body"]) {
        if (!schemas[part]) continue;
        const result = schemas[part].safeParse(req[part] ?? {});
        if (result.success) {
          validated[part] = result.data;
        } else {
          for (const issue of result.error.issues) {
            const key = issue.path.join(".") || "_";
            fields[key] ??= issue.message;
          }
        }
      }
      if (Object.keys(fields).length > 0) {
        return next(new ValidationError("Verifique os campos destacados.", fields));
      }

      req.validated = validated;
      next();
    };
  }
}
