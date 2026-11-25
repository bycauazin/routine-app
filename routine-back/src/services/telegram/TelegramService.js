import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors.js";
import { todayIn } from "../../utils/dateUtils.js";
import DayService from "../DayService.js";
import logger from "../logger.js";
import AuthTokenService from "../security/AuthTokenService.js";
import WaterService from "../WaterService.js";
import * as msg from "./messages.js";
import { parseMessage } from "./parser.js";
import { telegramApi } from "./telegramApi.js";

const LINK_TTL_MINUTES = 15;

/**
 * The Telegram bot (stage 7): links a chat to a user (one-time t.me link from
 * Configurações), then reads messages with the rules in parser.js. Everything
 * goes through the same services as the screens. Updates arrive by webhook in
 * production and by `npm run telegram:poll` on the computer.
 */
class TelegramService {
  get enabled() {
    return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
  }

  // ── Configurações → Telegram ──

  async status(userId) {
    const link = this.enabled ? await prisma.telegramLink.findUnique({ where: { userId } }) : null;
    return { enabled: this.enabled, botUsername: this.enabled ? env.TELEGRAM_BOT_USERNAME : null, linked: Boolean(link), username: link?.username ?? null, linkedAt: link?.linkedAt ?? null };
  }

  /** One-time t.me link that opens the bot already tied to this user. */
  async createLink(userId) {
    if (!this.enabled) throw new AppError("TELEGRAM_OFF", "O bot do Telegram não está configurado.", 503);
    const token = await AuthTokenService.issue(userId, "TELEGRAM_LINK", LINK_TTL_MINUTES);
    return { url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  async unlink(userId) {
    await prisma.telegramLink.deleteMany({ where: { userId } });
  }

  // ── Updates ──

  async handleUpdate(update) {
    const message = update.message;
    if (!message?.chat?.id || typeof message.text !== "string") return;
    try {
      await this.onMessage(message);
    } catch (error) {
      logger.error("Telegram update failed", { error: error.message });
      await telegramApi.sendMessage(message.chat.id, msg.failed()).catch(() => {});
    }
  }

  async userOf(chatId) {
    const link = await prisma.telegramLink.findUnique({ where: { chatId: BigInt(chatId) }, include: { user: { select: { id: true, name: true } } } });
    return link?.user ?? null;
  }

  async onMessage(message) {
    const chatId = message.chat.id;
    const text = message.text.trim();
    const start = text.match(/^\/start\s+(\S+)/);
    if (start) return this.linkChat(chatId, start[1], message.from?.username ?? null);

    const user = await this.userOf(chatId);
    if (!user) return telegramApi.sendMessage(chatId, msg.notLinked());
    const reply = await this.answer(user, parseMessage(text));
    return telegramApi.sendMessage(chatId, reply);
  }

  /** The reply text for a parsed message (no Telegram call: easy to test). */
  async answer(user, parsed) {
    switch (parsed.intent) {
      case "help":
        return msg.help();
      case "summary":
        return msg.summary(await DayService.get(user.id, todayIn()), { title: "Seu dia hoje" });
      case "water":
        return msg.water(await WaterService.add(user.id, { amountMl: parsed.amountMl }));
      default:
        return msg.unknown();
    }
  }

  async linkChat(chatId, token, username) {
    const userId = (await AuthTokenService.consume(token, "TELEGRAM_LINK").catch(() => null))?.userId;
    if (!userId) return telegramApi.sendMessage(chatId, msg.linkExpired());
    // A chat belongs to one user, and a user has one chat: the newest link wins.
    await prisma.$transaction([
      prisma.telegramLink.deleteMany({ where: { OR: [{ userId }, { chatId: BigInt(chatId) }] } }),
      prisma.telegramLink.create({ data: { userId, chatId: BigInt(chatId), username } }),
    ]);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return telegramApi.sendMessage(chatId, msg.linked(user?.name ?? ""));
  }
}

export default new TelegramService();
