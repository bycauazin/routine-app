import { SESSION_COOKIE, sessionCookieOptions } from "../config/session.js";
import AuthService from "../services/AuthService.js";
import { BaseController } from "./BaseController.js";

class AuthController extends BaseController {
  get routes() {
    return {
      options: "/auth/options",
      login: "/auth/login",
      loginTwoFactor: "/auth/login/two-factor",
      logout: "/auth/logout",
      demo: "/auth/demo",
      me: "/auth/me",
      register: "/auth/register",
      verifyEmail: "/auth/verify-email",
      resendVerification: "/auth/resend-verification",
      forgotPassword: "/auth/forgot-password",
      resetPassword: "/auth/reset-password",
      confirmEmailChange: "/auth/confirm-email-change",
      profile: "/me",
      password: "/me/password",
      email: "/me/email",
    };
  }

  /** Client IP (real one behind a proxy when TRUST_PROXY=true). */
  meta(req) {
    return { ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null };
  }

  options() {
    return (_req, res) => this.ok(res, AuthService.options());
  }

  register() {
    return async (req, res) => {
      this.ok(res, await AuthService.register(req.validated.body, this.meta(req)), {}, 202);
    };
  }

  verifyEmail() {
    return async (req, res) => {
      this.ok(res, await AuthService.verifyEmail(req.validated.body.token));
    };
  }

  resendVerification() {
    return async (req, res) => {
      await AuthService.resendVerification(req.validated.body.email, this.meta(req));
      this.noContent(res);
    };
  }

  forgotPassword() {
    return async (req, res) => {
      await AuthService.forgotPassword(req.validated.body.email, this.meta(req));
      this.noContent(res);
    };
  }

  resetPassword() {
    return async (req, res) => {
      await AuthService.resetPassword(req.validated.body);
      this.noContent(res);
    };
  }

  confirmEmailChange() {
    return async (req, res) => {
      await AuthService.confirmEmailChange(req.validated.body.token);
      this.noContent(res);
    };
  }

  changeEmail() {
    return async (req, res) => {
      this.ok(res, await AuthService.requestEmailChange({ userId: this.userId(req), ...req.validated.body }));
    };
  }

  login() {
    return async (req, res) => {
      const result = await AuthService.login(req.validated.body, this.meta(req));
      // Two-step verification on: no cookie yet, the client asks for the code.
      if (result.twoFactorRequired) return this.ok(res, { twoFactorRequired: true, ticket: result.ticket });
      this.signIn(res, result);
    };
  }

  loginTwoFactor() {
    return async (req, res) => {
      this.signIn(res, await AuthService.loginTwoFactor(req.validated.body, this.meta(req)));
    };
  }

  signIn(res, { token, expiresAt, user }) {
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
    this.ok(res, { user });
  }

  logout() {
    return async (req, res) => {
      if (req.auth) await AuthService.logout(req.auth.sessionId, req.auth.user);
      res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
      this.noContent(res);
    };
  }

  /** "Ver demonstração": a demo account just for this visitor, signed in on this device. */
  openDemo() {
    return async (req, res) => {
      this.signIn(res, await AuthService.openDemo(req.auth, this.meta(req)));
    };
  }

  me() {
    return (req, res) => this.ok(res, { user: AuthService.toPublicUser(req.auth.user) });
  }

  updateProfile() {
    return async (req, res) => {
      this.ok(res, { user: await AuthService.updateProfile(this.userId(req), req.validated.body) });
    };
  }

  changePassword() {
    return async (req, res) => {
      const result = await AuthService.changePassword({ userId: this.userId(req), sessionId: req.auth.sessionId, ...req.validated.body });
      this.ok(res, result);
    };
  }
}

export default new AuthController();
