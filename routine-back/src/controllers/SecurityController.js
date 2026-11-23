import { SESSION_COOKIE, sessionCookieOptions } from "../config/session.js";
import AccountSecurityService from "../services/AccountSecurityService.js";
import { BaseController } from "./BaseController.js";

/** "Configurações → Segurança": devices, two-step verification, your data. */
class SecurityController extends BaseController {
  get routes() {
    return {
      sessions: "/me/sessions",
      session: "/me/sessions/:id",
      twoFactor: "/me/two-factor",
      twoFactorSetup: "/me/two-factor/setup",
      twoFactorEnable: "/me/two-factor/enable",
      twoFactorDisable: "/me/two-factor/disable",
      recoveryCodes: "/me/two-factor/recovery-codes",
      exportData: "/me/export",
      account: "/me",
    };
  }

  listSessions() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.listSessions(this.userId(req), req.auth.sessionId));
    };
  }

  revokeSession() {
    return async (req, res) => {
      await AccountSecurityService.revokeSession(this.userId(req), req.validated.params.id);
      this.noContent(res);
    };
  }

  revokeOtherSessions() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.revokeOtherSessions(this.userId(req), req.auth.sessionId));
    };
  }

  twoFactorStatus() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.twoFactorStatus(this.userId(req)));
    };
  }

  startTwoFactor() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.startTwoFactor(this.userId(req), req.validated.body.currentPassword));
    };
  }

  enableTwoFactor() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.enableTwoFactor(this.userId(req), req.auth.sessionId, req.validated.body.code));
    };
  }

  disableTwoFactor() {
    return async (req, res) => {
      await AccountSecurityService.disableTwoFactor(this.userId(req), req.validated.body);
      this.noContent(res);
    };
  }

  regenerateRecoveryCodes() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.regenerateRecoveryCodes(this.userId(req), req.validated.body));
    };
  }

  exportData() {
    return async (req, res) => {
      this.ok(res, await AccountSecurityService.exportData(this.userId(req)));
    };
  }

  deleteAccount() {
    return async (req, res) => {
      await AccountSecurityService.deleteAccount(this.userId(req), req.validated.body);
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
      this.noContent(res);
    };
  }
}

export default new SecurityController();
