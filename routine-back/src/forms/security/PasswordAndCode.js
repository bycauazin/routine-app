import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { currentPasswordSchema, secondFactorCodeSchema } from "../shared/schemas.js";

/** `{ currentPassword, code }`: turn 2FA off, new recovery codes. */
export default class PasswordAndCode extends BaseForm {
  static get schemas() {
    return { body: z.object({ currentPassword: currentPasswordSchema, code: secondFactorCodeSchema }) };
  }
}
