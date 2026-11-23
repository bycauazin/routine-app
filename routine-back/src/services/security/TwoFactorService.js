import RecoveryCodeDao from "../../daos/RecoveryCodeDao.js";
import UserDao from "../../daos/UserDao.js";
import { withTransaction } from "../../database/transaction.js";
import { ConflictError, ValidationError } from "../../shared/errors.js";
import { RECOVERY_CODE_COUNT, TWO_FACTOR_MAX_FAILURES, TWO_FACTOR_WINDOW_MINUTES } from "../../shared/constants.js";
import AuditService from "../AuditService.js";
import RateLimitService from "./RateLimitService.js";
import { seal, tokenDigest, unseal } from "./secrets.js";
import TotpService from "./TotpService.js";

const wrongCode = () => new ValidationError("Código inválido. Confira o app autenticador e tente de novo.", { code: "Código inválido." });

/**
 * Two-step verification with an authenticator app (TOTP). Turning it on takes
 * two steps: `setup` creates the key (shown as a QR code), `enable` checks the
 * first code and returns the recovery codes, shown only once.
 */
class TwoFactorService {
  /** @param {{ twoFactorEnabledAt?: Date | null }} user */
  isEnabled(user) {
    return Boolean(user?.twoFactorEnabledAt);
  }

  async status(userId) {
    const user = await UserDao.findById(userId);
    return { enabled: this.isEnabled(user), recoveryCodesLeft: this.isEnabled(user) ? await RecoveryCodeDao.countByUser(userId) : 0 };
  }

  /** Creates a new key (replacing an unfinished set-up). Refused while 2FA is on. */
  async setup(user) {
    if (this.isEnabled(user)) throw new ConflictError("A verificação em duas etapas já está ativada.");
    const key = TotpService.generateKey();
    await UserDao.updateById(user.id, { twoFactorSecret: seal(key), twoFactorLastStep: null });
    return { otpauthUrl: TotpService.otpauthUrl(key, user.email), manualKey: TotpService.formatKey(key) };
  }

  /** Checks the first code from the app, turns 2FA on and returns the recovery codes. */
  async enable(user, code) {
    if (this.isEnabled(user)) throw new ConflictError("A verificação em duas etapas já está ativada.");
    if (!user.twoFactorSecret) throw new ValidationError("Comece a configuração de novo.", { code: "Comece a configuração de novo." });
    await this.limit(user.id);
    const step = TotpService.match(unseal(user.twoFactorSecret), code);
    if (step === null) {
      await RateLimitService.record(this.failureKey(user.id));
      throw wrongCode();
    }
    const codes = this.newRecoveryCodes();
    await withTransaction(async (tx) => {
      await UserDao.updateById(user.id, { twoFactorEnabledAt: new Date(), twoFactorLastStep: step }, { tx });
      await RecoveryCodeDao.replaceAll(user.id, codes.map((c) => this.recoveryDigest(c)), { tx });
      await AuditService.record({ userId: user.id, action: "auth.two_factor_enabled", entityType: "user", entityId: user.id }, { tx });
    });
    return { recoveryCodes: codes };
  }

  /**
   * Checks a code from the app or a recovery code. Wrong codes count towards
   * a lock (TWO_FACTOR_MAX_FAILURES per TWO_FACTOR_WINDOW_MINUTES).
   * @returns {Promise<"app" | "recovery">}
   */
  async verify(user, rawCode) {
    if (!this.isEnabled(user)) throw new ConflictError("A verificação em duas etapas não está ativada.");
    await this.limit(user.id);
    const code = String(rawCode ?? "").trim();
    const digits = code.replace(/\s/g, "");
    if (/^\d{6}$/.test(digits)) {
      const step = TotpService.match(unseal(user.twoFactorSecret), digits, { afterStep: user.twoFactorLastStep ?? -1 });
      if (step !== null && (await UserDao.advanceTwoFactorStep(user.id, step))) return "app";
    } else if (TotpService.normalizeRecoveryCode(code).length === 10) {
      if (await RecoveryCodeDao.consume(user.id, this.recoveryDigest(code))) {
        await AuditService.record({ userId: user.id, action: "auth.recovery_code_used", entityType: "user", entityId: user.id });
        return "recovery";
      }
    }
    await RateLimitService.record(this.failureKey(user.id));
    throw wrongCode();
  }

  /** New recovery codes (the old ones stop working). Needs a valid code. */
  async regenerateRecoveryCodes(user, code) {
    await this.verify(user, code);
    const codes = this.newRecoveryCodes();
    await withTransaction(async (tx) => {
      await RecoveryCodeDao.replaceAll(user.id, codes.map((c) => this.recoveryDigest(c)), { tx });
      await AuditService.record({ userId: user.id, action: "auth.recovery_codes_regenerated", entityType: "user", entityId: user.id }, { tx });
    });
    return { recoveryCodes: codes };
  }

  /** Erases the key and recovery codes: 2FA off. Callers check the code first. */
  async clear(userId) {
    await withTransaction(async (tx) => {
      await UserDao.updateById(userId, { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null }, { tx });
      await RecoveryCodeDao.deleteByUser(userId, { tx });
      await AuditService.record({ userId, action: "auth.two_factor_disabled", entityType: "user", entityId: userId }, { tx });
    });
  }

  failureKey(userId) {
    return `2fa:${userId}`;
  }

  limit(userId) {
    return RateLimitService.check(this.failureKey(userId), TWO_FACTOR_MAX_FAILURES, TWO_FACTOR_WINDOW_MINUTES, `Muitos códigos errados. Aguarde ${TWO_FACTOR_WINDOW_MINUTES} minutos e tente novamente.`);
  }

  newRecoveryCodes() {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => TotpService.generateRecoveryCode());
  }

  recoveryDigest(code) {
    return tokenDigest(`recovery:${TotpService.normalizeRecoveryCode(code)}`);
  }
}

export default new TwoFactorService();
