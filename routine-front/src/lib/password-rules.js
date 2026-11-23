import { z } from "zod";

/** Same rule as the API (forms/shared/schemas.js): 10 to 128 characters. */
export const newPasswordRules = z.string().min(10, "A senha precisa ter pelo menos 10 caracteres.").max(128, "Use no máximo 128 caracteres.");
