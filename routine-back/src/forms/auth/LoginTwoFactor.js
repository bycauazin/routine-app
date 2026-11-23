import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { secondFactorCodeSchema } from "../shared/schemas.js";

/** Second step of the login: the ticket from the first step + the authenticator (or recovery) code. */
export default class LoginTwoFactor extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        ticket: z.string({ error: "Entre de novo." }).regex(/^[A-Za-z0-9_-]{43}$/, { error: "Entre de novo." }),
        code: secondFactorCodeSchema,
      }),
    };
  }
}
