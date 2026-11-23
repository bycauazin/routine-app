import { z } from "zod";
import { BaseForm } from "../BaseForm.js";

/** Name and/or the "first steps" guide state. */
export default class UpdateProfile extends BaseForm {
  static get schemas() {
    return {
      body: z
        .object({
          name: z.string().trim().min(1, { error: "Informe seu nome." }).max(80).optional(),
          onboardingCompleted: z.boolean().optional(),
        })
        .refine((d) => Object.keys(d).length > 0, { error: "Nada para atualizar." }),
    };
  }
}
