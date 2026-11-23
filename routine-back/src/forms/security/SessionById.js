import { z } from "zod";
import { BaseForm } from "../BaseForm.js";

/** Route `/me/sessions/:id`: the session's stored HMAC (64 hex characters). */
export default class SessionById extends BaseForm {
  static get schemas() {
    return { params: z.object({ id: z.string().regex(/^[0-9a-f]{64}$/) }) };
  }
}
