import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../../config/env.js";
import { addDays, isCivilDate } from "../../utils/dateUtils.js";
import logger from "../logger.js";

/**
 * AI fallback for the Telegram bot (7C), from the Finance bot: reads a message
 * the rules in parser.js did not understand (typos, other words, "semana que
 * vem"…) and returns the parser's shape. Gemini when GEMINI_API_KEY is set
 * (free tier), else Claude when ANTHROPIC_API_KEY is set; no key = AI off.
 *
 * It receives only the message and today's date: no routine, names or
 * history. Every field it returns is checked here, and it never saves:
 * tasks and imprevistos still wait for "Salvar".
 */

/** One try: the webhook must answer well within Vercel's limit. */
const TIMEOUT_MS = 10_000;
const INTENTS = ["task", "done", "unplanned", "water", "summary", "none"];

const Reading = z.object({
  intent: z.enum(INTENTS),
  name: z.string(),
  date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  period: z.enum(["MORNING", "AFTERNOON", "NIGHT"]).nullable(),
  amount_ml: z.number().int(),
});

const READING_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: INTENTS },
    name: { type: "string" },
    date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    start_time: { type: ["string", "null"], description: "HH:MM" },
    end_time: { type: ["string", "null"], description: "HH:MM" },
    period: { type: ["string", "null"], enum: ["MORNING", "AFTERNOON", "NIGHT", null] },
    amount_ml: { type: "integer" },
  },
  required: ["intent", "name", "date", "start_time", "end_time", "period", "amount_ml"],
};

const SYSTEM = `You read short Brazilian Portuguese messages sent to a personal routine bot and turn them into structured data. Users type fast on the phone: expect typos, slang and relative dates ("amanhã", "sábado", "semana que vem", "depois do almoço").

intent:
- "task": the user wants to note something to do ("preciso ligar pro banco amanhã", "não esquecer de comprar ração"). name = the task, 1 to 6 words, first letter capitalized, typos fixed. date = the day when said (YYYY-MM-DD), else null. start_time when a time is said, else null. period = MORNING/AFTERNOON/NIGHT when only a part of the day is said, else null.
- "done": the user says they did something ("acabei o treino", "já li hoje"). name = what was done, 1 to 4 words.
- "unplanned": something outside the plan took time and has a start and an end ("fiquei preso no trânsito das 18 às 19:30", "trabalhei de freela sábado das 14 às 21"). name = what it was, 1 to 4 words ("Trânsito", "Freelance", "Cano estourado"). date = the day (today when not said), start_time and end_time as HH:MM.
- "water": the user drank water. amount_ml = the amount in ml ("um copo" = 250, "uma garrafa" = 500).
- "summary": asks how the day is or what is left today.
- "none": anything else, or unclear. Never guess.

Unused fields: name "", date null, times null, period null, amount_ml 0. Answer only with the JSON object.`;

export const aiProvider = () => (env.GEMINI_API_KEY ? "gemini" : env.ANTHROPIC_API_KEY ? "anthropic" : null);
export const aiEnabled = () => aiProvider() !== null;

const toMinute = (hhmm) => {
  const m = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
};
const cleanName = (s, max = 60) => {
  const name = String(s ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  return name ? name[0].toLocaleUpperCase("pt-BR") + name.slice(1) : "";
};

/** Checks the AI's answer and converts it to the parser's shape, or null. Exported for tests. */
export function toParsed(r, { today }) {
  if (!r) return null;
  const day = (d, from, to) => (isCivilDate(d) && d >= from && d <= to ? d : null);
  if (r.intent === "summary") return { intent: "summary", viaAI: true };
  if (r.intent === "water") return Number.isInteger(r.amount_ml) && r.amount_ml >= 1 && r.amount_ml <= 5000 ? { intent: "water", amountMl: r.amount_ml, viaAI: true } : null;
  const name = cleanName(r.name);
  if (!name) return null;
  if (r.intent === "done") return { intent: "done", query: name, viaAI: true };
  if (r.intent === "task") {
    const startMinute = toMinute(r.start_time);
    const date = day(r.date, today, addDays(today, 366)) ?? (startMinute !== null || r.period ? today : null);
    return { intent: "task", name, date, period: startMinute === null ? (r.period ?? null) : null, startMinute, endMinute: null, viaAI: true };
  }
  if (r.intent === "unplanned") {
    const startMinute = toMinute(r.start_time);
    const endMinute = toMinute(r.end_time);
    if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
    return { intent: "unplanned", name, date: day(r.date, addDays(today, -7), addDays(today, 366)) ?? today, startMinute, endMinute, viaAI: true };
  }
  return null;
}

let gemini;
async function readWithGemini(prompt) {
  gemini ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const interaction = await gemini.interactions.create(
    {
      model: env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      input: prompt,
      system_instruction: SYSTEM,
      store: false,
      response_format: { type: "text", mime_type: "application/json", schema: READING_JSON_SCHEMA },
      generation_config: { thinking_level: "minimal", max_output_tokens: 512 },
    },
    { timeout_ms: TIMEOUT_MS, retries: { strategy: "none" } },
  );
  if (!interaction.output_text) return null;
  const checked = Reading.safeParse(JSON.parse(interaction.output_text));
  return checked.success ? checked.data : null;
}

let anthropic;
async function readWithClaude(prompt) {
  anthropic ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
  const response = await anthropic.messages.parse({
    model: env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(Reading) },
    messages: [{ role: "user", content: prompt }],
  });
  return response.stop_reason === "end_turn" ? (response.parsed_output ?? null) : null;
}

/** Asks the configured AI; null when off, unclear, slow or failing ("não entendi" stands). */
export async function interpret(text, { today }) {
  const provider = aiProvider();
  if (!provider) return null;
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const prompt = [`Today: ${today} (${weekday})`, "", "Message:", `<message>${String(text).slice(0, 300)}</message>`].join("\n");
  try {
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("AI deadline"), { name: "TimeoutError" })), TIMEOUT_MS + 1_000);
    });
    const call = provider === "gemini" ? readWithGemini(prompt) : readWithClaude(prompt);
    const reading = await Promise.race([call, deadline]).finally(() => clearTimeout(timer));
    return toParsed(reading, { today });
  } catch (error) {
    if (error instanceof Anthropic.APIError) logger.warn("Telegram AI (Claude) API error", { status: error.status });
    else logger.warn(`Telegram AI (${provider}) failed`, { status: error?.status, error: error?.name ?? "Error" });
    return null;
  }
}
