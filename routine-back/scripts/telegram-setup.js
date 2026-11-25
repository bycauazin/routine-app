/**
 * Production: points the bot at this app's webhook and sets its command list.
 *
 *   npm run telegram:setup -- https://seu-dominio.vercel.app
 */
import { env } from "../src/config/env.js";
import { telegramApi } from "../src/services/telegram/telegramApi.js";

const base = process.argv[2]?.replace(/\/$/, "");
if (!base?.startsWith("https://")) throw new Error("Uso: npm run telegram:setup -- https://seu-dominio");
if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) throw new Error("Defina TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET.");
await telegramApi.setWebhook(`${base}/api/telegram/webhook`, env.TELEGRAM_WEBHOOK_SECRET);
await telegramApi.setCommands([
  { command: "resumo", description: "Seu dia de hoje" },
  { command: "ajuda", description: "O que o bot entende" },
]);
console.log("✔ Webhook e comandos configurados.");
