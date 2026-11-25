import { z } from "zod";
import { GOAL_UNITS } from "../utils/reportUtils.js";
import { BaseForm } from "./BaseForm.js";
import { civilDateSchema, idParams, nameSchema } from "./shared/schemas.js";

const dateSchema = civilDateSchema.refine((date) => date >= "1900-01-01" && date <= "9998-12-31", { error: "Data fora do intervalo." });
const body = z.object({
  name: nameSchema,
  subject: z.enum(Object.keys(GOAL_UNITS), { error: "Escolha o que deseja acompanhar." }),
  targetKey: z.uuid({ error: "Escolha um item válido." }).nullable().optional(),
  unit: z.enum(["COUNT", "ML", "PERCENT", "MINUTES"], { error: "Escolha a unidade." }),
  amount: z.number({ error: "Informe um valor." }).int().min(1, { error: "Use um valor maior que zero." }).max(1_000_000, { error: "Use um valor menor." }),
  period: z.enum(["DAY", "WEEK", "MONTH"], { error: "Escolha o período." }),
});

export class ReportRange extends BaseForm {
  static get schemas() {
    return { query: z.object({ from: dateSchema.optional(), to: dateSchema.optional() }) };
  }
}

export class CreateGoal extends BaseForm {
  static get schemas() {
    return { body };
  }
}

export class EditGoal extends BaseForm {
  static get schemas() {
    return { params: idParams, body };
  }
}

export class ReviewDay extends BaseForm {
  static get schemas() {
    return {
      params: z.object({ date: dateSchema }),
      body: z.object({
        ids: z.array(z.uuid()).min(1).max(100),
        status: z.enum(["DONE", "NOT_DONE", "SKIPPED"], { error: "Escolha como marcar os itens." }),
      }),
    };
  }
}
