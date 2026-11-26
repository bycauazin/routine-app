import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import DayItemDao from "../../daos/DayItemDao.js";
import RequestCounterDao from "../../daos/RequestCounterDao.js";
import { TELEGRAM_AI_PER_HOUR } from "../../shared/constants.js";
import { AppError } from "../../shared/errors.js";
import { addDays, civilDateToDb, minuteOfDayIn, todayIn } from "../../utils/dateUtils.js";
import DayService from "../DayService.js";
import logger from "../logger.js";
import AuthTokenService from "../security/AuthTokenService.js";
import WaterService from "../WaterService.js";
import { aiEnabled, interpret } from "./ai.js";
import * as msg from "./messages.js";
import { parseMessage } from "./parser.js";
import { telegramApi } from "./telegramApi.js";

const LINK_TTL_MINUTES = 15;
const DRAFT_TTL_MS = 24 * 3_600_000;
/** Without an "Acordar" today, the morning summary goes at 7:00. */
const DEFAULT_WAKE_MINUTE = 420;

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const overlaps = (item, start, end) => item.startMinute !== null && item.startMinute < end && (item.endMinute ?? item.startMinute + 1) > start;

/**
 * The Telegram bot (stage 7): links a chat to a user (one-time t.me link from
 * Configurações), then reads messages with the rules in parser.js and, when
 * they do not understand, the AI in ai.js. Tasks and imprevistos become a
 * draft with Salvar/Cancelar; "fiz …" marks right away (with Desfazer).
 * Everything goes through the same services as the screens. Updates arrive by
 * webhook in production and by `npm run telegram:poll` on the computer.
 *
 * `answer` and `callback` return `{ text, buttons }` and never call Telegram,
 * so they are easy to test.
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
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (!chatId) return;
    try {
      if (update.callback_query) await this.onCallback(update.callback_query);
      else if (typeof update.message?.text === "string") await this.onMessage(update.message);
    } catch (error) {
      logger.error("Telegram update failed", { error: error.message });
      await telegramApi.sendMessage(chatId, msg.failed()).catch(() => {});
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
    const reply = await this.answer(user, text);
    return telegramApi.sendMessage(chatId, reply.text, reply.buttons);
  }

  async onCallback(query) {
    const chatId = query.message.chat.id;
    const user = await this.userOf(chatId);
    if (!user) {
      await telegramApi.answerCallback(query.id);
      return telegramApi.sendMessage(chatId, msg.notLinked());
    }
    const reply = await this.callback(user, String(query.data ?? ""));
    await telegramApi.answerCallback(query.id);
    return telegramApi.editMessage(chatId, query.message.message_id, reply.text, reply.buttons);
  }

  /** The reply to a message: rules first, then the AI for what they did not understand. */
  async answer(user, text, today = todayIn()) {
    let parsed = parseMessage(text, today);
    if (parsed.intent === "unknown" && (await this.aiAllowed(user.id))) parsed = (await interpret(text, { today })) ?? parsed;
    switch (parsed.intent) {
      case "help":
        return { text: msg.help() };
      case "summary":
        return { text: msg.summary(await DayService.get(user.id, today), { title: "Seu dia hoje" }) };
      case "water":
        return { text: msg.water(await WaterService.add(user.id, { amountMl: parsed.amountMl })) };
      case "task":
        return this.draft(user, { type: "task", name: parsed.name, date: parsed.date, period: parsed.period ?? null, startMinute: parsed.startMinute ?? null, endMinute: parsed.endMinute ?? null, viaAI: Boolean(parsed.viaAI) }, today);
      case "unplanned":
        return this.unplannedDraft(user, parsed, today);
      case "done":
        return this.markDone(user, parsed.query, today);
      default:
        return { text: msg.unknown() };
    }
  }

  /** At most TELEGRAM_AI_PER_HOUR AI readings per person per hour (counted in the database, shared by every instance). */
  async aiAllowed(userId) {
    if (!aiEnabled()) return false;
    const now = Date.now();
    const count = await RequestCounterDao.increment(`telegram-ai:${userId}`, new Date(now - (now % 3_600_000)));
    return count <= TELEGRAM_AI_PER_HOUR;
  }

  async unplannedDraft(user, parsed, today) {
    if (parsed.startMinute === null || parsed.endMinute === null || parsed.endMinute <= parsed.startMinute) return { text: msg.unplannedNeedsTime() };
    const day = await DayService.get(user.id, parsed.date);
    const covered = day.items.filter((i) => !i.isUnplanned && i.status === "PENDING" && overlaps(i, parsed.startMinute, parsed.endMinute));
    return this.draft(user, { type: "unplanned", name: parsed.name, date: parsed.date, startMinute: parsed.startMinute, endMinute: parsed.endMinute, displaceIds: covered.map((i) => i.id), taken: covered.map((i) => i.name), viaAI: Boolean(parsed.viaAI) }, today);
  }

  async draft(user, payload, today) {
    await prisma.telegramDraft.deleteMany({ where: { userId: user.id, createdAt: { lt: new Date(Date.now() - DRAFT_TTL_MS) } } });
    const draft = await prisma.telegramDraft.create({ data: { userId: user.id, payload } });
    const text = payload.type === "task" ? msg.taskDraft(payload, today) : payload.type === "unplanned" ? msg.unplannedDraft(payload, today) : msg.choose(payload.query);
    const buttons = payload.type === "choose" ? payload.options.map((o, i) => [{ text: o.label, data: `o:${draft.id}:${i}` }]).concat([[{ text: "Cancelar", data: `c:${draft.id}` }]]) : msg.SAVE_CANCEL(draft.id);
    return { text, buttons };
  }

  /** "fiz …": the pending item (or afazer) of today whose name matches. */
  async markDone(user, query, today) {
    const day = await DayService.get(user.id, today);
    const q = norm(query);
    const options = [];
    for (const item of [...day.items, ...day.anytime, ...(day.overdue ?? [])]) {
      if (item.isUnplanned || item.status === "SKIPPED") continue;
      if (item.status === "PENDING") options.push({ itemId: item.id, name: item.name, label: item.name });
      for (const step of item.steps ?? []) if (!step.doneAt) options.push({ itemId: item.id, stepId: step.id, name: step.name, label: `${step.name} (${item.name})` });
    }
    const unique = (list) => [...new Map(list.map((o) => [`${o.itemId}/${o.stepId ?? ""}`, o])).values()];
    const exact = unique(options.filter((o) => norm(o.name) === q));
    const found = exact.length ? exact : unique(options.filter((o) => norm(o.name).includes(q) || (q.length >= 4 && q.includes(norm(o.name)))));
    if (!found.length) return { text: msg.notFound(query) };
    if (found.length > 1) return this.draft(user, { type: "choose", query, options: found.slice(0, 6) }, today);
    return this.doOption(user, found[0]);
  }

  async doOption(user, option) {
    if (option.stepId) {
      await DayService.setStep(user.id, option.itemId, option.stepId, { done: true });
      return { text: msg.doneItem(option.label) };
    }
    await DayService.setStatus(user.id, option.itemId, { status: "DONE" });
    return { text: msg.doneItem(option.label), buttons: [[{ text: "Desfazer", data: `u:${option.itemId}` }]] };
  }

  /** A button: s:<draft> salvar, c:<draft> cancelar, o:<draft>:<n> escolher, u:<item> desfazer. */
  async callback(user, data) {
    const [action, id, index] = data.split(":");
    if (action === "u") {
      const item = await DayItemDao.findOwned(user.id, id).catch(() => null);
      await DayService.setStatus(user.id, id, { status: "PENDING" });
      return { text: msg.undone(item?.name ?? "item") };
    }
    const draft = id ? await prisma.telegramDraft.findFirst({ where: { id, userId: user.id } }) : null;
    if (!draft) return { text: msg.expired() };
    await prisma.telegramDraft.delete({ where: { id: draft.id } });
    const p = draft.payload;
    if (action === "c") return { text: msg.cancelled() };
    if (action === "o") {
      const option = p.options?.[Number(index)];
      return option ? this.doOption(user, option) : { text: msg.expired() };
    }
    if (action !== "s") return { text: msg.expired() };
    const today = todayIn();
    if (p.type === "task") {
      await DayService.createOneOff(user.id, p.date, { kind: "TASK", name: p.name, period: p.period, startMinute: p.startMinute, endMinute: p.endMinute });
      return { text: msg.saved(msg.taskDraft({ ...p, viaAI: false }, today)) };
    }
    await DayService.createOneOff(user.id, p.date, { kind: "APPOINTMENT", name: p.name, startMinute: p.startMinute, endMinute: p.endMinute, unplanned: true, displaceIds: p.displaceIds });
    return { text: msg.saved(msg.unplannedDraft({ ...p, viaAI: false }, today)) };
  }

  // ── 7D: resumo da manhã ──

  /**
   * Called every ~15 min (GET /api/cron/morning): each linked person gets the
   * day once, from their Acordar time on, with what was left undone yesterday.
   */
  async morning({ today = todayIn(), minute = minuteOfDayIn() } = {}) {
    if (!this.enabled) return { sent: 0 };
    const links = await prisma.telegramLink.findMany({
      where: { OR: [{ morningSentOn: null }, { morningSentOn: { lt: civilDateToDb(today) } }] },
      include: { user: { select: { id: true, name: true } } },
    });
    let sent = 0;
    for (const link of links) {
      try {
        const text = await this.morningText(link.user, today, minute);
        if (!text) continue;
        await telegramApi.sendMessage(Number(link.chatId), text);
        await prisma.telegramLink.update({ where: { userId: link.userId }, data: { morningSentOn: civilDateToDb(today) } });
        sent += 1;
      } catch (error) {
        logger.warn("Telegram morning summary failed", { error: error.message });
      }
    }
    return { sent };
  }

  /** The morning text, or null while it is not time yet. */
  async morningText(user, today, minute) {
    const day = await DayService.get(user.id, today);
    const wake = day.items.find((i) => /acordar/.test(norm(i.name)) && i.startMinute !== null)?.startMinute ?? DEFAULT_WAKE_MINUTE;
    if (minute < wake) return null;
    await DayService.materialize(user.id, addDays(today, -1), addDays(today, -1));
    const left = await DayItemDao.findAllOwned(user.id, { where: { date: civilDateToDb(addDays(today, -1)), status: "PENDING", isUnplanned: false, kind: { not: "APPOINTMENT" } }, select: { name: true }, orderBy: { startMinute: "asc" } });
    return msg.morning(day, { name: user.name, yesterday: [...new Set(left.map((i) => i.name))] });
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
