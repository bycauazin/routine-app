import { env } from "../config/env.js";
import LoginAttemptDao from "../daos/LoginAttemptDao.js";
import RecoveryCodeDao from "../daos/RecoveryCodeDao.js";
import UserDao from "../daos/UserDao.js";
import { withTransaction } from "../database/transaction.js";
import { AppError, ConflictError, ForbiddenError, isUniqueViolation, RateLimitError, ValidationError } from "../shared/errors.js";
import {
  DEMO_MAX_PER_IP,
  DEMO_WINDOW_MINUTES,
  EMAIL_ACTION_MAX_PER_ADDRESS,
  EMAIL_ACTION_MAX_PER_IP,
  EMAIL_ACTION_WINDOW_MINUTES,
  EMAIL_CHANGE_TTL_MINUTES,
  EMAIL_VERIFY_TTL_MINUTES,
  LOGIN_MAX_FAILURES_PER_EMAIL,
  LOGIN_MAX_FAILURES_PER_IP,
  LOGIN_WINDOW_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
  SIGNUP_MAX_PER_IP,
  SIGNUP_WINDOW_MINUTES,
  TWO_FACTOR_LOGIN_TTL_MINUTES,
  isDemoEmail,
} from "../shared/constants.js";
import { todayIn, yearMonthOf } from "../utils/dateUtils.js";
import { keepAlive } from "../utils/keepAlive.js";
import AuditService from "./AuditService.js";
import DemoService from "./DemoService.js";
import logger from "./logger.js";
import MailService from "./mail/MailService.js";
import * as mails from "./mail/templates.js";
import AuthTokenService from "./security/AuthTokenService.js";
import PasswordService from "./security/PasswordService.js";
import RateLimitService from "./security/RateLimitService.js";
import SessionService from "./security/SessionService.js";
import TwoFactorService from "./security/TwoFactorService.js";
import UserService from "./UserService.js";

const invalidCredentials = () => new AppError("INVALID_CREDENTIALS", "E-mail ou senha incorretos.", 401);
const expiredTicket = () => new AppError("TWO_FACTOR_EXPIRED", "A verificação expirou. Entre de novo com e-mail e senha.", 401);

class AuthService {
  /** Fields safe to send to the client. */
  toPublicUser(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboardingCompletedAt: user.onboardingCompletedAt,
      twoFactorEnabled: Boolean(user.twoFactorEnabledAt),
      /** A demonstration account (fictional data, one per visitor, opened from the login screen). */
      demo: Boolean(user.demoExpiresAt),
      /** Day and month the user started using the app: reports start here (no history before it). */
      startDate: user.createdAt ? todayIn(undefined, user.createdAt) : null,
      startMonth: user.createdAt ? yearMonthOf(todayIn(undefined, user.createdAt)) : null,
    };
  }

  /** What the login screen needs to know before anyone signs in. */
  options() {
    return { signupEnabled: env.SIGNUP_ENABLED, demoEnabled: true };
  }

  /** Throws 429 after too many failures for this e-mail or IP in the window. */
  async assertNotRateLimited(email, ipAddress) {
    const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
    const [byEmail, byIp] = await Promise.all([
      LoginAttemptDao.countFailuresByIdentifier(email, since),
      ipAddress ? LoginAttemptDao.countFailuresByIp(ipAddress, since) : 0,
    ]);
    if (byEmail >= LOGIN_MAX_FAILURES_PER_EMAIL || byIp >= LOGIN_MAX_FAILURES_PER_IP) {
      throw new RateLimitError(`Muitas tentativas de login. Aguarde ${LOGIN_WINDOW_MINUTES} minutos e tente novamente.`, LOGIN_WINDOW_MINUTES * 60);
    }
  }

  async recordAttempt(email, ipAddress, success) {
    await LoginAttemptDao.create({ identifier: email, ipAddress, success });
    // Housekeeping: attempts older than a day are no longer useful.
    if (Math.random() < 0.05) await LoginAttemptDao.deleteOlderThan(new Date(Date.now() - 86_400_000));
  }

  /** Limits actions that send e-mails: per address and per IP. */
  async limitEmailAction(action, email, ipAddress) {
    const message = `Muitos pedidos seguidos. Aguarde ${EMAIL_ACTION_WINDOW_MINUTES} minutos e tente novamente.`;
    if (ipAddress) await RateLimitService.hit(`${action}-ip:${ipAddress}`, EMAIL_ACTION_MAX_PER_IP, EMAIL_ACTION_WINDOW_MINUTES, message);
    await RateLimitService.hit(`${action}:${email}`, EMAIL_ACTION_MAX_PER_ADDRESS, EMAIL_ACTION_WINDOW_MINUTES, message);
  }

  /**
   * @param {{ email: string, password: string }} credentials (validated)
   * @param {{ ipAddress?: string | null, userAgent?: string | null }} meta
   */
  async login({ email, password }, meta) {
    const ipAddress = meta.ipAddress ?? null;
    await this.assertNotRateLimited(email, ipAddress);

    // Demonstration accounts never sign in with a password (only from "Ver demonstração").
    const found = isDemoEmail(email) ? null : await UserDao.findByEmail(email);
    const user = found?.demoExpiresAt ? null : found;
    const { valid, needsRehash } = user
      ? await PasswordService.check(user.passwordHash, password)
      : { ...(await PasswordService.check(await PasswordService.dummyHash(), password)), valid: false };

    if (!user || !valid) {
      await this.recordAttempt(email, ipAddress, false);
      throw invalidCredentials();
    }
    await this.recordAttempt(email, ipAddress, true);
    // Password saved before AUTH_SECRET existed: store it again with the pepper.
    if (needsRehash) await UserDao.updateById(user.id, { passwordHash: await PasswordService.hash(password) });
    // Only said after the right password, so it reveals nothing to strangers.
    if (!user.emailVerifiedAt) {
      throw new AppError("EMAIL_NOT_VERIFIED", "Confirme seu e-mail para entrar. Procure o link que enviamos quando você criou a conta.", 403);
    }
    if (!user.approvedAt) {
      throw new AppError("ACCOUNT_PENDING", "Sua conta está aguardando liberação. Você recebe um e-mail assim que ela for aprovada.", 403);
    }
    // Two-step verification: no session yet, only a short-lived ticket for the code step.
    if (TwoFactorService.isEnabled(user)) {
      const ticket = await AuthTokenService.issue(user.id, "TWO_FACTOR_LOGIN", TWO_FACTOR_LOGIN_TTL_MINUTES);
      return { twoFactorRequired: true, ticket };
    }
    const session = await SessionService.create(user.id, meta);
    return { ...session, user: this.toPublicUser(user) };
  }

  /**
   * Second step of the login when two-step verification is on: the ticket
   * from the first step plus a code from the app (or a recovery code). A
   * wrong code keeps the ticket, so the person can type it again.
   */
  async loginTwoFactor({ ticket, code }, meta) {
    const record = await AuthTokenService.peek(ticket, "TWO_FACTOR_LOGIN", expiredTicket);
    const user = await UserDao.findById(record.userId);
    if (!user || !TwoFactorService.isEnabled(user)) throw expiredTicket();
    const method = await TwoFactorService.verify(user, code);
    try {
      await AuthTokenService.consume(ticket, "TWO_FACTOR_LOGIN");
    } catch {
      throw expiredTicket(); // used by a request at the same time
    }
    if (method === "recovery") await this.notifyRecoveryCodeUsed(user);
    const session = await SessionService.create(user.id, meta);
    return { ...session, user: this.toPublicUser(user) };
  }

  async notifyRecoveryCodeUsed(user) {
    const left = await RecoveryCodeDao.countByUser(user.id);
    this.sendInBackground(user.email, mails.recoveryCodeUsed({ name: user.name, left }));
  }

  /** Ends this session. Leaving a demonstration account deletes it. */
  async logout(sessionId, user) {
    await SessionService.invalidate(sessionId);
    await DemoService.discard(user);
  }

  /**
   * "Ver demonstração" on the login screen: builds a demo account just for
   * this visitor and signs this device in to it. Whoever was signed in on
   * this device is signed out first.
   */
  async openDemo(currentAuth, meta) {
    if (meta.ipAddress) {
      await RateLimitService.hit(`demo-ip:${meta.ipAddress}`, DEMO_MAX_PER_IP, DEMO_WINDOW_MINUTES, "Muitas demonstrações abertas daqui. Tente de novo mais tarde.");
    }
    if (currentAuth) await this.logout(currentAuth.sessionId, currentAuth.user);
    const { userId, expiresAt } = await DemoService.create();
    const session = await SessionService.create(userId, meta, { until: expiresAt });
    return { ...session, user: this.toPublicUser(await UserDao.findById(userId)) };
  }

  /**
   * Public sign-up. The answer is the same whether the e-mail is new or
   * already registered (no way to find out who has an account): a new address
   * gets a confirmation link, a known one gets a "you already have an account" note.
   * @param {{ name: string, email: string, password: string }} input (validated)
   */
  async register({ name, email, password }, { ipAddress = null } = {}) {
    if (!env.SIGNUP_ENABLED) throw new ForbiddenError("O cadastro está fechado no momento.");
    if (ipAddress) {
      await RateLimitService.hit(`register-ip:${ipAddress}`, SIGNUP_MAX_PER_IP, SIGNUP_WINDOW_MINUTES, "Muitos cadastros feitos daqui. Tente de novo mais tarde.");
    }
    await RateLimitService.hit(`register:${email}`, EMAIL_ACTION_MAX_PER_ADDRESS, EMAIL_ACTION_WINDOW_MINUTES, `Muitos pedidos seguidos. Aguarde ${EMAIL_ACTION_WINDOW_MINUTES} minutos e tente novamente.`);

    if (isDemoEmail(email)) return { email };
    const existing = await UserDao.findByEmail(email);
    if (existing) {
      await PasswordService.hash(password); // same time as a real sign-up
      this.sendInBackground(email, mails.accountExists({ name: existing.name }));
      return { email };
    }

    let user;
    try {
      // No admin yet (a fresh install): nobody could approve, so the first account is the admin, already approved.
      const first = (await UserDao.count({ where: { role: "ADMIN" } })) === 0;
      user = await UserService.create({ email, name, password, verified: false, approved: first, role: first ? "ADMIN" : "USER" });
    } catch (error) {
      // Two sign-ups for the same address at once: answer like any other.
      if (error instanceof ConflictError) return { email };
      throw error;
    }
    const token = await AuthTokenService.issue(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MINUTES);
    this.sendInBackground(email, mails.verifyEmail({ name: user.name, token }));
    return { email };
  }

  /**
   * Opens the confirmation link. An account still waiting for approval makes
   * the admins get an e-mail to let it in. Returns `{ pendingApproval }`.
   */
  async verifyEmail(token) {
    const user = await withTransaction(async (tx) => {
      const record = await AuthTokenService.consume(token, "EMAIL_VERIFY", { tx });
      const current = await UserDao.findById(record.userId, { tx });
      if (!current.emailVerifiedAt) await UserDao.updateById(current.id, { emailVerifiedAt: new Date() }, { tx });
      await AuditService.record({ userId: current.id, action: "auth.email_verified", entityType: "user", entityId: current.id }, { tx });
      return current;
    });
    if (user.approvedAt) return { pendingApproval: false };
    for (const admin of await UserDao.listAdmins()) {
      this.sendInBackground(admin.email, mails.approvalRequested({ name: admin.name, applicantName: user.name, applicantEmail: user.email }));
    }
    return { pendingApproval: true };
  }

  /** Sends a new confirmation link. Same answer whatever the e-mail is. */
  async resendVerification(email, { ipAddress = null } = {}) {
    await this.limitEmailAction("verify", email, ipAddress);
    const user = await UserDao.findByEmail(email);
    if (!user || user.emailVerifiedAt) return;
    const token = await AuthTokenService.issue(user.id, "EMAIL_VERIFY", EMAIL_VERIFY_TTL_MINUTES);
    this.sendInBackground(email, mails.verifyEmail({ name: user.name, token }));
  }

  /** "Esqueci minha senha": e-mails a reset link if the account exists. Same answer either way. */
  async forgotPassword(email, { ipAddress = null } = {}) {
    await this.limitEmailAction("reset", email, ipAddress);
    const user = isDemoEmail(email) ? null : await UserDao.findByEmail(email);
    if (!user || user.demoExpiresAt) return;
    const token = await AuthTokenService.issue(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MINUTES);
    this.sendInBackground(email, mails.resetPassword({ name: user.name, token }));
  }

  /**
   * Sets a new password from the e-mail link. Signs out every device and
   * cancels other links; the e-mail counts as confirmed (the link proved it).
   */
  async resetPassword({ token, password }) {
    const passwordHash = await PasswordService.hash(password);
    const user = await withTransaction(async (tx) => {
      const record = await AuthTokenService.consume(token, "PASSWORD_RESET", { tx });
      const current = await UserDao.findById(record.userId, { tx });
      await UserDao.updateById(current.id, { passwordHash, emailVerifiedAt: current.emailVerifiedAt ?? new Date() }, { tx });
      await AuthTokenService.revokeAll(current.id, "PASSWORD_RESET", { tx });
      await AuditService.record({ userId: current.id, action: "auth.password_reset", entityType: "user", entityId: current.id }, { tx });
      return current;
    });
    await SessionService.invalidateUser(user.id);
    this.sendInBackground(user.email, mails.passwordChanged({ name: user.name }));
  }

  async updateProfile(userId, { name, onboardingCompleted }) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (onboardingCompleted !== undefined) data.onboardingCompletedAt = onboardingCompleted ? new Date() : null;
    return this.toPublicUser(await UserDao.updateById(userId, data));
  }

  /** Throws a field error when the current password is wrong. */
  async assertCurrentPassword(user, currentPassword) {
    const { valid } = await PasswordService.check(user.passwordHash, currentPassword);
    if (!valid) throw new ValidationError("Senha atual incorreta.", { currentPassword: "Senha atual incorreta." });
  }

  /** Changes the password and signs out every other device. */
  async changePassword({ userId, sessionId, currentPassword, newPassword }) {
    const user = await UserDao.findById(userId);
    await this.assertCurrentPassword(user, currentPassword);
    const passwordHash = await PasswordService.hash(newPassword);
    await withTransaction(async (tx) => {
      await UserDao.updateById(userId, { passwordHash }, { tx });
      await AuditService.record({ userId, action: "auth.password_changed", entityType: "user", entityId: userId }, { tx });
    });
    const otherSessionsSignedOut = await SessionService.invalidateUser(userId, sessionId);
    return { otherSessionsSignedOut };
  }

  /**
   * Asks to change the login e-mail: needs the current password; a link goes
   * to the new address (the change only happens when it is opened) and a
   * warning goes to the current one. Same answer if the new address is taken.
   */
  async requestEmailChange({ userId, currentPassword, newEmail }) {
    const user = await UserDao.findById(userId);
    await this.assertCurrentPassword(user, currentPassword);
    if (newEmail === user.email) throw new ValidationError("Este já é o seu e-mail.", { newEmail: "Este já é o seu e-mail." });
    await RateLimitService.hit(`email-change:${userId}`, EMAIL_ACTION_MAX_PER_ADDRESS, EMAIL_ACTION_WINDOW_MINUTES, `Muitos pedidos seguidos. Aguarde ${EMAIL_ACTION_WINDOW_MINUTES} minutos e tente novamente.`);

    const taken = await UserDao.findByEmail(newEmail);
    if (taken) {
      this.sendInBackground(newEmail, mails.accountExists({ name: taken.name }));
    } else {
      const token = await AuthTokenService.issue(userId, "EMAIL_CHANGE", EMAIL_CHANGE_TTL_MINUTES, { newEmail });
      this.sendInBackground(newEmail, mails.confirmNewEmail({ name: user.name, token }));
    }
    this.sendInBackground(user.email, mails.emailChangeRequested({ name: user.name, newEmail }));
    return { pendingEmail: newEmail };
  }

  /** Opens the link sent to the new address: it becomes the login e-mail. */
  async confirmEmailChange(token) {
    try {
      await withTransaction(async (tx) => {
        const record = await AuthTokenService.consume(token, "EMAIL_CHANGE", { tx });
        await UserDao.updateById(record.userId, { email: record.newEmail, emailVerifiedAt: new Date() }, { tx });
        await AuditService.record({ userId: record.userId, action: "auth.email_changed", entityType: "user", entityId: record.userId }, { tx });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError("Esse e-mail passou a ser usado por outra conta. Escolha outro.");
      throw error;
    }
  }

  /**
   * Sends without waiting. Talking to the e-mail server takes about a second,
   * so waiting would make the answer slower when the account exists, and the
   * response time alone would tell a stranger who has an account. A failure
   * is only logged; the person can ask again ("reenviar", "esqueci a senha").
   */
  sendInBackground(to, message) {
    const sending = MailService.send({ to, ...message }).catch((error) => {
      logger.error("E-mail not sent", { subject: message.subject, error });
    });
    keepAlive(sending);
  }
}

export default new AuthService();
