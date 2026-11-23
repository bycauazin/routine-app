import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "../../shared/constants.js";
import { BaseForm } from "../BaseForm.js";
import { emailSchema } from "../shared/schemas.js";

export default class ChangeEmail extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        newEmail: emailSchema,
        currentPassword: z.string({ error: "Informe a senha atual." }).min(1, { error: "Informe a senha atual." }).max(PASSWORD_MAX_LENGTH),
      }),
    };
  }
}
