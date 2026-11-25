/**
 * Runs the Telegram bot on this computer (no public URL for a webhook):
 * removes the webhook, then asks Telegram for new messages in a loop.
 * Stop with Ctrl+C. In production the webhook is used (npm run telegram:setup).
 *
 *   npm run telegram:poll
 */
import { prisma } from "../src/database/prisma.js";
import TelegramService from "../src/services/telegram/TelegramService.js";
import { telegramApi } from "../src/services/telegram/telegramApi.js";

if (!TelegramService.enabled) {
  console.error("✖ Defina TELEGRAM_BOT_TOKEN e TELEGRAM_BOT_USERNAME no .env do routine-back.");
  process.exit(1);
}

await telegramApi.deleteWebhook();
console.log("✔ Bot rodando neste computador. Mande uma mensagem para ele no Telegram. Ctrl+C para parar.");
let offset;
let running = true;
process.on("SIGINT", () => {
  running = false;
  console.log("\nParando…");
});
while (running) {
  try {
    const updates = await telegramApi.getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      await TelegramService.handleUpdate(update);
    }
  } catch (error) {
    console.error(`✖ ${error.message}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}
await prisma.$disconnect();
