import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { linkTokenSchema, newPasswordSchema } from "../shared/schemas.js";

export default class ResetPassword extends BaseForm {
  static get schemas() {
    return { body: z.object({ token: linkTokenSchema, password: newPasswordSchema }) };
  }
}
