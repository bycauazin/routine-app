import { z } from "zod";
import { CATEGORY_COLOR_KEYS, DAY_PERIODS, MAX_WORKOUT_TYPES, ONE_OFF_KINDS, RULE_KINDS, SHIFT_MINUTES_MAX, WORK_MODES } from "../../shared/constants.js";
import { BaseForm } from "../BaseForm.js";
import { civilDateSchema, iconSchema, idParams, nameSchema, optionalTextSchema, queryBoolean } from "../shared/schemas.js";

/** Minutes since 00:00 (the full check, start before end, is in utils/routineUtils.minutesError). */
const minuteSchema = z.number({ error: "Horário inválido." }).int({ error: "Horário inválido." }).min(0, { error: "Horário inválido." }).max(1440, { error: "Horário inválido." }).nullable().optional();
const categoryIdSchema = z.uuid({ error: "Categoria inválida." }).nullable().optional();
const weekdaysSchema = z.array(z.number().int().min(0).max(6), { error: "Escolha os dias da semana." }).min(1, { error: "Escolha pelo menos um dia da semana." }).max(7);
const dateParams = z.object({ date: civilDateSchema });
const periodSchema = z.enum(DAY_PERIODS, { error: "Período inválido." }).nullable().optional();
const modeSchema = z.enum(WORK_MODES, { error: "Escolha presencial ou home." }).nullable().optional();
/** Workout done or planned ("Muay thai"): free text, the list in settings is only a suggestion. */
const variantSchema = optionalTextSchema(40);
const itemIconSchema = iconSchema.nullable().optional();
const stepMinuteSchema = z.number({ error: "Horário inválido." }).int().min(0, { error: "Horário inválido." }).max(1439, { error: "Horário inválido." }).nullable().optional();
const stepsSchema = z
  .array(z.object({ key: z.uuid().optional(), name: z.string().trim().max(60, { error: "Use no máximo 60 caracteres." }), minute: stepMinuteSchema }), { error: "Afazeres inválidos." })
  .max(20, { error: "Use no máximo 20 afazeres." })
  .optional();

// ── Categories ──

const categoryFields = {
  name: nameSchema,
  colorKey: z.enum(CATEGORY_COLOR_KEYS, { error: "Escolha uma cor." }),
  icon: iconSchema,
};

export class ListCategories extends BaseForm {
  static get schemas() {
    return { query: z.object({ includeArchived: queryBoolean }) };
  }
}

export class CreateCategory extends BaseForm {
  static get schemas() {
    return { body: z.object(categoryFields) };
  }
}

export class UpdateCategory extends BaseForm {
  static get schemas() {
    return { params: idParams, body: z.object({ ...categoryFields, isArchived: z.boolean(), sortOrder: z.number().int().min(0).max(999) }).partial() };
  }
}

// ── Rules (rotina fixa) ──

const ruleFields = {
  /** Every fixed item is a block (ROUTINE); the field is kept for old clients. */
  kind: z.enum(RULE_KINDS, { error: "Escolha o tipo." }).optional(),
  name: nameSchema,
  categoryId: categoryIdSchema,
  weekdays: weekdaysSchema,
  startMinute: minuteSchema,
  endMinute: minuteSchema,
  period: periodSchema,
  mode: modeSchema,
  variant: variantSchema,
  icon: itemIconSchema,
  steps: stepsSchema,
  insideRuleIds: z.array(z.uuid({ error: "Bloco inválido." }), { error: "Blocos inválidos." }).max(20).optional(),
  skipOnHolidays: z.boolean().optional(),
  notes: optionalTextSchema(300),
};

export class CreateRule extends BaseForm {
  static get schemas() {
    return { body: z.object({ ...ruleFields, startDate: civilDateSchema.optional(), endDate: civilDateSchema.nullable().optional() }) };
  }
}

/** "Daqui pra frente": `from` is the first day the change applies to (default today). */
export class UpdateRule extends BaseForm {
  static get schemas() {
    return { params: idParams, body: z.object(ruleFields).partial().extend({ from: civilDateSchema.optional() }) };
  }
}

/** Changes from `from` on, only on some of the rule's weekdays (the rule is split in two). */
export class SplitRule extends BaseForm {
  static get schemas() {
    return { params: idParams, body: z.object(ruleFields).partial().extend({ from: civilDateSchema.optional(), weekdays: weekdaysSchema }) };
  }
}

export class RemoveRule extends BaseForm {
  static get schemas() {
    return { params: idParams, query: z.object({ from: civilDateSchema.optional() }) };
  }
}

// ── The day ──

export class DayByDate extends BaseForm {
  static get schemas() {
    return { params: dateParams };
  }
}

/** "Hoje é home": `null` puts the day back on its weekday's default. */
export class SetDayMode extends BaseForm {
  static get schemas() {
    return { params: dateParams, body: z.object({ mode: z.enum(WORK_MODES, { error: "Escolha presencial ou home." }).nullable() }) };
  }
}

/** A task without a date ("A fazer"). */
export class CreateTask extends BaseForm {
  static get schemas() {
    return { body: z.object({ name: nameSchema, categoryId: categoryIdSchema, icon: itemIconSchema, notes: optionalTextSchema(300) }) };
  }
}

/** "Afazeres só neste dia": the whole list; `id` keeps an existing step (and its check). */
export class SetSteps extends BaseForm {
  static get schemas() {
    return {
      params: idParams,
      body: z.object({
        steps: z
          .array(z.object({ id: z.uuid().optional(), name: z.string().trim().max(60, { error: "Use no máximo 60 caracteres." }), minute: stepMinuteSchema }), { error: "Afazeres inválidos." })
          .max(20, { error: "Use no máximo 20 afazeres." }),
      }),
    };
  }
}

export class SetStep extends BaseForm {
  static get schemas() {
    return { params: z.object({ id: z.uuid(), stepId: z.uuid() }), body: z.object({ done: z.boolean({ error: "Informe se foi feito." }) }) };
  }
}

export class UpdateRoutineSettings extends BaseForm {
  static get schemas() {
    return {
      body: z
        .object({
          officeWeekdays: z.array(z.number().int().min(0).max(6), { error: "Escolha os dias." }).max(7),
          workoutTypes: z.array(z.string().trim().max(40, { error: "Use no máximo 40 caracteres." }), { error: "Tipos inválidos." }).max(MAX_WORKOUT_TYPES, { error: `Use no máximo ${MAX_WORKOUT_TYPES} tipos.` }),
        })
        .partial(),
    };
  }
}

export class CreateOneOff extends BaseForm {
  static get schemas() {
    return {
      params: dateParams,
      body: z.object({
        kind: z.enum(ONE_OFF_KINDS, { error: "Escolha tarefa ou compromisso." }),
        name: nameSchema,
        categoryId: categoryIdSchema,
        icon: itemIconSchema,
        startMinute: minuteSchema,
        endMinute: minuteSchema,
        period: periodSchema,
        notes: optionalTextSchema(300),
        unplanned: z.boolean().optional(),
        displaceIds: z.array(z.uuid({ error: "Item inválido." })).max(50).optional(),
      }),
    };
  }
}

export class SetItemStatus extends BaseForm {
  static get schemas() {
    return {
      params: idParams,
      body: z.object({
        status: z.enum(["PENDING", "DONE", "SKIPPED"], { error: "Situação inválida." }),
        reason: optionalTextSchema(120),
        /** "Fiz em outro horário": minutes since 00:00 of the item's day. */
        doneMinute: z.number({ error: "Horário inválido." }).int().min(0, { error: "Horário inválido." }).max(1439, { error: "Horário inválido." }).optional(),
        variant: variantSchema,
      }),
    };
  }
}

/** "Só hoje" / remarcar. */
export class UpdateItem extends BaseForm {
  static get schemas() {
    return {
      params: idParams,
      body: z.object({
        name: nameSchema,
        categoryId: categoryIdSchema,
        startMinute: minuteSchema,
        endMinute: minuteSchema,
        period: periodSchema,
        variant: variantSchema,
        icon: itemIconSchema,
        /** null = no date (only a one-off task: back to "A fazer"). */
        date: civilDateSchema.nullable(),
        notes: optionalTextSchema(300),
      }).partial(),
    };
  }
}

export class ShiftItem extends BaseForm {
  static get schemas() {
    return {
      params: idParams,
      body: z.object({ minutes: z.number({ error: "Informe os minutos." }).int().min(-SHIFT_MINUTES_MAX).max(SHIFT_MINUTES_MAX).refine((m) => m !== 0, { error: "Informe os minutos." }) }),
    };
  }
}

// ── Water (stage 4) ──

const amountSchema = z.number({ error: "Informe quanto bebeu, em ml." }).int({ error: "Use um número inteiro de ml." }).min(1, { error: "Informe quanto bebeu, em ml." }).max(5000, { error: "Use no máximo 5.000 ml por registro." });

export class WaterDay extends BaseForm {
  static get schemas() {
    return { params: dateParams };
  }
}

export class AddWater extends BaseForm {
  static get schemas() {
    return { body: z.object({ amountMl: amountSchema, date: civilDateSchema.optional() }) };
  }
}

export class UndoWater extends BaseForm {
  static get schemas() {
    return { query: z.object({ date: civilDateSchema.optional() }) };
  }
}

export class SetWaterGoal extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        goalMl: z.number({ error: "Informe a meta em ml." }).int().min(250, { error: "Use pelo menos 250 ml." }).max(10000, { error: "Use no máximo 10.000 ml." }),
        date: civilDateSchema.optional(),
      }),
    };
  }
}

// ── Simulações ──

const simBlockSchema = z.object({
  key: z.uuid({ error: "Bloco inválido." }),
  name: z.string({ error: "Informe o nome." }).max(60, { error: "Use no máximo 60 caracteres." }),
  categoryId: z.uuid().nullable().optional(),
  icon: itemIconSchema,
  weekdays: z.array(z.number().int().min(0).max(6), { error: "Escolha os dias." }).max(7),
  startMinute: minuteSchema,
  endMinute: minuteSchema,
  period: periodSchema,
  steps: z.array(z.object({ name: z.string().max(60), minute: stepMinuteSchema }), { error: "Afazeres inválidos." }).max(20).optional(),
  insideKeys: z.array(z.uuid()).max(30).optional(),
});
const simNameSchema = z.string({ error: "Dê um nome à simulação." }).trim().min(1, { error: "Dê um nome à simulação." }).max(60, { error: "Use no máximo 60 caracteres." });

export class CreateSimulation extends BaseForm {
  static get schemas() {
    return { body: z.object({ name: simNameSchema, from: z.union([z.enum(["current", "empty"]), z.uuid()], { error: "Escolha de onde começar." }).optional() }) };
  }
}

export class UpdateSimulation extends BaseForm {
  static get schemas() {
    return { params: idParams, body: z.object({ name: simNameSchema.optional(), blocks: z.array(simBlockSchema, { error: "Blocos inválidos." }).optional() }) };
  }
}

export class ApplySimulation extends BaseForm {
  static get schemas() {
    return { params: idParams, body: z.object({ from: civilDateSchema.optional() }) };
  }
}

// ── Dias especiais (stage 5) ──

export class ListSpecialDays extends BaseForm {
  static get schemas() {
    return { query: z.object({ from: civilDateSchema.optional(), to: civilDateSchema.optional() }) };
  }
}

export class CreateSpecialDay extends BaseForm {
  static get schemas() {
    return {
      body: z.object({
        kind: z.enum(["HOLIDAY", "VACATION", "SICK"], { error: "Escolha feriado, férias ou doente." }),
        from: civilDateSchema,
        to: civilDateSchema.optional(),
        name: optionalTextSchema(60),
      }),
    };
  }
}
