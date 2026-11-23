import nodemailer from "nodemailer";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import logger from "../logger.js";

/**
 * Sends e-mails. MAIL_PROVIDER picks how:
 * - "console" (development): prints the e-mail in the API terminal, so links
 *   can be opened without any e-mail service;
 * - "gmail": sends it from a Gmail account through Google's SMTP server
 *   (Nodemailer; GMAIL_USER + GMAIL_APP_PASSWORD);
 * - "resend": sends it through the Resend API (RESEND_API_KEY, MAIL_FROM).
 * In tests, messages are kept in `outbox` instead.
 */
class MailService {
  /** @type {{ to: string, subject: string, text: string, html: string }[]} */
  outbox = [];

  /** @param {{ to: string, subject: string, text: string, html: string }} message */
  async send(message) {
    if (env.isTest) {
      this.outbox.push(message);
      return;
    }

    if (env.MAIL_PROVIDER === "console") {
      if (env.isProduction) {
        logger.warn("E-mail not sent: MAIL_PROVIDER is console", { subject: message.subject });
        return;
      }
      // Development only (never in production): the link must be visible to be opened.
      process.stdout.write(`\n──── e-mail (desenvolvimento, não enviado) ────\nPara: ${message.to}\nAssunto: ${message.subject}\n\n${message.text}\n───────────────────────────────────────────────\n\n`);
      return;
    }

    if (env.MAIL_PROVIDER === "gmail") return this.sendWithGmail(message);

    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      logger.error("E-mail provider unreachable", { subject: message.subject, error });
      throw mailFailed();
    }
    if (!response.ok) {
      logger.error("E-mail provider rejected the message", { status: response.status, subject: message.subject });
      throw mailFailed();
    }
  }

  /** Google's SMTP server over TLS, signed in with the app password. */
  async sendWithGmail(message) {
    this._gmail ??= nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    try {
      await this._gmail.sendMail({ from: env.MAIL_FROM, to: message.to, subject: message.subject, text: message.text, html: message.html });
    } catch (error) {
      // Only the code: the error text can echo the address or the server reply.
      logger.error("Gmail did not send the message", { subject: message.subject, code: error?.code, responseCode: error?.responseCode });
      throw mailFailed();
    }
  }
}

const mailFailed = () => new AppError("MAIL_FAILED", "Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.", 503);

export default new MailService();
