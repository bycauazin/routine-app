import UserDao from "../daos/UserDao.js";
import UserDataDao from "../daos/UserDataDao.js";
import { ConflictError, ValidationError } from "../shared/errors.js";
import AuthService from "./AuthService.js";
import logger from "./logger.js";
import * as mails from "./mail/templates.js";
import SessionService from "./security/SessionService.js";
import TwoFactorService from "./security/TwoFactorService.js";

/**
 * "Configurações → Segurança": signed-in devices, two-step verification,
 * downloading every stored record and deleting the account.
 */
class AccountSecurityService {
  // ───── Devices ─────

  listSessions(userId, currentSessionId) {
    return SessionService.list(userId, currentSessionId);
  }

  revokeSession(userId, sessionId) {
    return SessionService.revoke(userId, sessionId);
  }

  /** Signs out every other device; returns how many. */
  async revokeOtherSessions(userId, currentSessionId) {
    return { signedOut: await SessionService.invalidateUser(userId, currentSessionId) };
  }

  // ───── Two-step verification ─────

  twoFactorStatus(userId) {
    return TwoFactorService.status(userId);
  }

  async startTwoFactor(userId, currentPassword) {
    const user = await UserDao.findById(userId);
    await AuthService.assertCurrentPassword(user, currentPassword);
    return TwoFactorService.setup(user);
  }

  /** Turns 2FA on, signs out the other devices (they entered without it) and warns by e-mail. */
  async enableTwoFactor(userId, currentSessionId, code) {
    const user = await UserDao.findById(userId);
    const result = await TwoFactorService.enable(user, code);
    await SessionService.invalidateUser(userId, currentSessionId);
    AuthService.sendInBackground(user.email, mails.twoFactorEnabled({ name: user.name }));
    return result;
  }

  async disableTwoFactor(userId, { currentPassword, code }) {
    const user = await this.withPasswordAndCode(userId, currentPassword, code);
    if (!TwoFactorService.isEnabled(user)) throw new ConflictError("A verificação em duas etapas não está ativada.");
    await TwoFactorService.clear(userId);
    AuthService.sendInBackground(user.email, mails.twoFactorDisabled({ name: user.name }));
  }

  async regenerateRecoveryCodes(userId, { currentPassword, code }) {
    const user = await UserDao.findById(userId);
    await AuthService.assertCurrentPassword(user, currentPassword);
    return TwoFactorService.regenerateRecoveryCodes(user, code);
  }

  // ───── Your data (LGPD) ─────

  async exportData(userId) {
    const data = await UserDataDao.exportAll(userId);
    return {
      exportedAt: new Date().toISOString(),
      notes: "Valores em centavos (ex.: 3500 = R$ 35,00). Datas de competência e vencimento no formato AAAA-MM-DD.",
      ...data,
    };
  }

  /**
   * Deletes the account and everything in it, for good. Needs the password,
   * and the two-step code when it is on.
   */
  async deleteAccount(userId, { currentPassword, code }) {
    const user = await this.withPasswordAndCode(userId, currentPassword, code);
    await UserDao.deleteById(userId);
    logger.info("Account deleted", { userId });
    AuthService.sendInBackground(user.email, mails.accountDeleted({ name: user.name }));
  }

  /** Checks the password, then the two-step code when 2FA is on. Returns the user. */
  async withPasswordAndCode(userId, currentPassword, code) {
    const user = await UserDao.findById(userId);
    await AuthService.assertCurrentPassword(user, currentPassword);
    if (TwoFactorService.isEnabled(user)) {
      if (!code) throw new ValidationError("Informe o código do app autenticador.", { code: "Informe o código do app autenticador." });
      const method = await TwoFactorService.verify(user, code);
      if (method === "recovery") await AuthService.notifyRecoveryCodeUsed(user);
    }
    return user;
  }
}

export default new AccountSecurityService();
