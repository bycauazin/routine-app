import { z } from "zod";

const GENERATE_SECRET = `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`;

/** Only the test suite runs without its own secret. */
const TEST_AUTH_SECRET = "test-only-secret-never-use-this-outside-the-test-suite";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3334),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    /** Origin of the web app (routine-front). Mutating requests from other origins are rejected; e-mail links point here. */
    APP_ORIGIN: z
      .url()
      .default("http://localhost:5174")
      // Only scheme + host + port: a pasted "https://site.app/" must still match the browser's Origin header.
      .transform((v) => new URL(v.trim()).origin),
    /** Set when running behind a reverse proxy (Nginx, Render, Railway…), so req.ip is the client IP. */
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    /**
     * Server secret (at least 32 characters). It is mixed into every password
     * hash (pepper) and signs the session and e-mail link tokens, so a copy of
     * the database alone is useless. Never change it: passwords stop working.
     */
    AUTH_SECRET: z.string().optional(),
    /** "false" closes the public sign-up page (accounts only through `npm run user:create`). */
    SIGNUP_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    /**
     * "console" prints e-mails in the terminal (development); "gmail" sends
     * them from a Gmail account (app password); "resend" through resend.com.
     */
    MAIL_PROVIDER: z.enum(["console", "gmail", "resend"]).default("console"),
    /** Gmail address that sends the e-mails, and its 16-letter app password (not the account password). */
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z
      .string()
      .optional()
      .transform((v) => v?.replace(/\s+/g, "")),
    RESEND_API_KEY: z.string().optional(),
    /** Sender shown in the e-mails. Default: "Routine <GMAIL_USER>" with Gmail. */
    MAIL_FROM: z.string().optional(),
    /** Telegram bot (stage 7), from @BotFather. Without both, the bot is off. */
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_BOT_USERNAME: z.string().optional(),
    /** Sent by Telegram in X-Telegram-Bot-Api-Secret-Token on every webhook call (set by `npm run telegram:setup`). */
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    /** Google Gemini API key (aistudio.google.com, free tier). When set, the bot's AI fallback uses Gemini. Optional. */
    GEMINI_API_KEY: z.string().optional(),
    /** Gemini model for the bot. Default: gemini-3.5-flash-lite. */
    GEMINI_MODEL: z.string().optional(),
    /** Claude API key: used for the bot's AI fallback when there is no GEMINI_API_KEY. Optional. */
    ANTHROPIC_API_KEY: z.string().optional(),
    /** Model for the bot's AI fallback. Default: claude-haiku-5-5. */
    ANTHROPIC_MODEL: z.string().optional(),
    /** Secret of GET /api/cron/morning (Authorization: Bearer …). Without it the endpoint is off. */
    CRON_SECRET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "test" && (!data.AUTH_SECRET || data.AUTH_SECRET.length < 32)) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: `missing or shorter than 32 characters. Generate one with:\n      ${GENERATE_SECRET}\n    and paste it in .env as AUTH_SECRET="..."`,
      });
    }
    if (data.MAIL_PROVIDER === "gmail") {
      if (!data.GMAIL_USER || !z.email().safeParse(data.GMAIL_USER).success) {
        ctx.addIssue({ code: "custom", path: ["GMAIL_USER"], message: "required when MAIL_PROVIDER=gmail (the Gmail address that sends the e-mails)" });
      }
      if (!data.GMAIL_APP_PASSWORD || data.GMAIL_APP_PASSWORD.length !== 16) {
        ctx.addIssue({ code: "custom", path: ["GMAIL_APP_PASSWORD"], message: "the 16-letter app password from myaccount.google.com/apppasswords (not your Gmail password)" });
      }
    }
    if (data.MAIL_PROVIDER === "resend" && !data.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "required when MAIL_PROVIDER=resend" });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}\nCopy .env.example to .env and fill it in.`);
}

export const env = Object.freeze({
  ...parsed.data,
  AUTH_SECRET: parsed.data.AUTH_SECRET ?? TEST_AUTH_SECRET,
  MAIL_FROM: parsed.data.MAIL_FROM || (parsed.data.MAIL_PROVIDER === "gmail" ? `Routine <${parsed.data.GMAIL_USER}>` : "Routine <onboarding@resend.dev>"),
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
});
