import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import TelegramService from "../services/telegram/TelegramService.js";
import { BaseController } from "./BaseController.js";

const sameSecret = (a, b) => {
  const x = Buffer.from(String(a ?? ""));
  const y = Buffer.from(String(b ?? ""));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Configurações → Telegram, and the webhook Telegram calls (stage 7). */
class TelegramController extends BaseController {
  get routes() {
    return { telegram: "/telegram", link: "/telegram/link" };
  }

  status() {
    return async (req, res) => this.ok(res, await TelegramService.status(this.userId(req)));
  }

  createLink() {
    return async (req, res) => this.ok(res, await TelegramService.createLink(this.userId(req)));
  }

  unlink() {
    return async (req, res) => {
      await TelegramService.unlink(this.userId(req));
      return this.ok(res, await TelegramService.status(this.userId(req)));
    };
  }

  /**
   * POST /api/telegram/webhook: called by Telegram, not by the browser (no
   * session, no CSRF). Only requests with the secret given to setWebhook get in.
   */
  webhook() {
    return async (req, res) => {
      if (!TelegramService.enabled || !env.TELEGRAM_WEBHOOK_SECRET || !sameSecret(req.get("x-telegram-bot-api-secret-token"), env.TELEGRAM_WEBHOOK_SECRET)) {
        return res.status(401).end();
      }
      await TelegramService.handleUpdate(req.body ?? {});
      return res.status(200).json({ ok: true });
    };
  }

  /**
   * GET /api/cron/morning: called by a scheduler every 15 minutes with
   * "Authorization: Bearer CRON_SECRET". Sends the morning summary to whoever
   * reached their Acordar time and did not get it today. Off without the secret.
   */
  morning() {
    return async (req, res) => {
      if (!env.CRON_SECRET || !sameSecret(req.get("authorization"), `Bearer ${env.CRON_SECRET}`)) return res.status(401).end();
      return res.status(200).json({ ok: true, ...(await TelegramService.morning()) });
    };
  }
}

export default new TelegramController();
