import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import forms from "../forms/index.js";
import { blockDemo, requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = AuthController;

// Public: sign in, sign up and the e-mail links.
router.get(routes.options, AuthController.options());
router.post(routes.login, forms.auth.Login.validate, AuthController.login());
router.post(routes.loginTwoFactor, forms.auth.LoginTwoFactor.validate, AuthController.loginTwoFactor());
router.post(routes.logout, AuthController.logout());
router.post(routes.demo, AuthController.openDemo());
router.post(routes.register, forms.auth.Register.validate, AuthController.register());
router.post(routes.verifyEmail, forms.auth.TokenOnly.validate, AuthController.verifyEmail());
router.post(routes.resendVerification, forms.auth.EmailOnly.validate, AuthController.resendVerification());
router.post(routes.forgotPassword, forms.auth.EmailOnly.validate, AuthController.forgotPassword());
router.post(routes.resetPassword, forms.auth.ResetPassword.validate, AuthController.resetPassword());
router.post(routes.confirmEmailChange, forms.auth.TokenOnly.validate, AuthController.confirmEmailChange());

// Signed in.
router.get(routes.me, requireAuth, AuthController.me());
router.patch(routes.profile, requireAuth, forms.auth.UpdateProfile.validate, AuthController.updateProfile());
router.put(routes.password, requireAuth, blockDemo, forms.auth.ChangePassword.validate, AuthController.changePassword());
router.put(routes.email, requireAuth, blockDemo, forms.auth.ChangeEmail.validate, AuthController.changeEmail());

export default router;
