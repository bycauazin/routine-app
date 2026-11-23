import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { emailSchema } from "../shared/schemas.js";

/** `{ email }`: forgot password, resend the confirmation link. */
export default class EmailOnly extends BaseForm {
  static get schemas() {
    return { body: z.object({ email: emailSchema }) };
  }
}
