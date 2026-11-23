import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { linkTokenSchema } from "../shared/schemas.js";

/** `{ token }` from an e-mail link (confirm e-mail, confirm new e-mail). */
export default class TokenOnly extends BaseForm {
  static get schemas() {
    return { body: z.object({ token: linkTokenSchema }) };
  }
}
