import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "../../shared/constants.js";
import { BaseForm } from "../BaseForm.js";
import { emailSchema } from "../shared/schemas.js";

export default class Login extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        email: emailSchema,
        // No strength rules on login: just bound the size before hashing.
        password: z.string({ error: "Informe a senha." }).min(1, { error: "Informe a senha." }).max(PASSWORD_MAX_LENGTH),
      }),
    };
  }
}
