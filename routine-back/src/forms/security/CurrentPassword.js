import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { currentPasswordSchema } from "../shared/schemas.js";

/** `{ currentPassword }`: start setting up two-step verification. */
export default class CurrentPassword extends BaseForm {
  static get schemas() {
    return { body: z.object({ currentPassword: currentPasswordSchema }) };
  }
}
