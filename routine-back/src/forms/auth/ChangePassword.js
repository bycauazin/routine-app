import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "../../shared/constants.js";
import { BaseForm } from "../BaseForm.js";
import { newPasswordSchema } from "../shared/schemas.js";

export default class ChangePassword extends BaseForm {
  static get schemas() {
    return {
      body: z
        .object({
          currentPassword: z.string().min(1, { error: "Informe a senha atual." }).max(PASSWORD_MAX_LENGTH),
          newPassword: newPasswordSchema,
        })
        .refine((d) => d.currentPassword !== d.newPassword, { path: ["newPassword"], error: "A nova senha deve ser diferente da atual." }),
    };
  }
}
