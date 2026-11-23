import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { currentPasswordSchema, secondFactorCodeSchema } from "../shared/schemas.js";

/** `{ currentPassword, code? }`: the code is required only when 2FA is on (checked by the service). */
export default class DeleteAccount extends BaseForm {
  static get schemas() {
    return { body: z.object({ currentPassword: currentPasswordSchema, code: secondFactorCodeSchema.optional() }) };
  }
}
