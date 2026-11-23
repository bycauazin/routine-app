import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { emailSchema, newPasswordSchema } from "../shared/schemas.js";

export default class Register extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        name: z.string({ error: "Informe seu nome." }).trim().min(1, { error: "Informe seu nome." }).max(80, { error: "Use no máximo 80 caracteres." }),
        email: emailSchema,
        password: newPasswordSchema,
      }),
    };
  }
}
