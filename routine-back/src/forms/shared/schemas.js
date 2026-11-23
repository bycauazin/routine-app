import { z } from "zod";
import { isCivilDate, isYearMonth } from "../../utils/dateUtils.js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../shared/constants.js";

/** Calendar date "YYYY-MM-DD". */
export const civilDateSchema = z
  .string({ error: "Informe a data." })
  .refine(isCivilDate, { error: "Data inválida." });

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: "Cor inválida." })
  .transform((v) => v.toLowerCase());

/** Icon identifier (Lucide icon name in kebab-case). */
export const iconSchema = z.string().regex(/^[a-z0-9-]{1,40}$/, { error: "Ícone inválido." });

export const nameSchema = z
  .string({ error: "Informe o nome." })
  .trim()
  .min(1, { error: "Informe o nome." })
  .max(60, { error: "Use no máximo 60 caracteres." });

export const optionalTextSchema = (max) =>
  z
    .string()
    .trim()
    .max(max, { error: `Use no máximo ${max} caracteres.` })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Query-string boolean: "true" / "false". */
export const queryBoolean = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");

/** Month "YYYY-MM" (2000-01 … 2100-12). */
export const yearMonthSchema = z
  .string({ error: "Informe o mês." })
  .refine(isYearMonth, { error: "Mês inválido (use AAAA-MM)." });

/** Route params `{ id }` (an invalid id becomes 404 in BaseForm). */
export const idParams = z.object({ id: z.uuid() });

/** Route params `{ month }` in "YYYY-MM". */
export const monthParams = z.object({ month: yearMonthSchema });

export const emailSchema = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "E-mail inválido." }).max(254));

/** Token from an e-mail link (32 random bytes, base64url). */
export const linkTokenSchema = z.string({ error: "Link inválido." }).regex(/^[A-Za-z0-9_-]{43}$/, { error: "Link inválido." });

/** The password the user types to confirm a sensitive action. */
export const currentPasswordSchema = z
  .string({ error: "Informe a senha atual." })
  .min(1, { error: "Informe a senha atual." })
  .max(PASSWORD_MAX_LENGTH, { error: "Senha atual incorreta." });

/** 6 digits from the authenticator app, or a recovery code ("abcde-fghjk"). */
export const secondFactorCodeSchema = z
  .string({ error: "Informe o código." })
  .trim()
  .min(1, { error: "Informe o código." })
  .max(20, { error: "Código inválido." });

export const newPasswordSchema = z
  .string({ error: "Informe a senha." })
  .min(PASSWORD_MIN_LENGTH, { error: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.` })
  .max(PASSWORD_MAX_LENGTH, { error: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.` });
