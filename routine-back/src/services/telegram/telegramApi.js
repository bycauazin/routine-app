import { env } from "../../config/env.js";
import logger from "../logger.js";

/**
 * Minimal Telegram Bot API client (only the calls the bot uses), from the
 * Finance bot. The token never goes into a log: errors log the method only.
 */
async function call(method, body, timeoutMs = 10_000) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    logger.warn("Telegram API call failed", { method, status: res.status, description: json.description });
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result;
}

/** Inline buttons: [[{ text, data }]] → Telegram's reply_markup. */
const keyboard = (rows) => (rows ? { reply_markup: { inline_keyboard: rows.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } } : {});

export const telegramApi = {
  sendMessage(chatId, text, buttons) {
    return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...keyboard(buttons) });
  },
  /** Replaces a message's text (and removes its buttons unless new ones are given). */
  editMessage(chatId, messageId, text, buttons) {
    return call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...keyboard(buttons ?? []) });
  },
  answerCallback(callbackQueryId, text) {
    return call("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
  },
  setWebhook(url, secretToken) {
    return call("setWebhook", { url, secret_token: secretToken, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  },
  deleteWebhook() {
    return call("deleteWebhook", { drop_pending_updates: false });
  },
  /** Long polling (development, no public URL): waits up to `timeout` seconds for new updates. */
  getUpdates(offset, timeout = 25) {
    return call("getUpdates", { offset, timeout, allowed_updates: ["message", "callback_query"] }, (timeout + 10) * 1000);
  },
  setCommands(commands) {
    return call("setMyCommands", { commands, language_code: "pt" }).then(() => call("setMyCommands", { commands }));
  },
};
