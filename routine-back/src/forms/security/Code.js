import { z } from "zod";
import { BaseForm } from "../BaseForm.js";
import { secondFactorCodeSchema } from "../shared/schemas.js";

/** `{ code }`: the first code from the authenticator app, to turn 2FA on. */
export default class Code extends BaseForm {
  static get schemas() {
    return { body: z.object({ code: secondFactorCodeSchema }) };
  }
}
