import { Router } from "express";
import SecurityController from "../controllers/SecurityController.js";
import forms from "../forms/index.js";
import { blockDemo, requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = SecurityController;

router.get(routes.sessions, requireAuth, SecurityController.listSessions());
router.delete(routes.sessions, requireAuth, SecurityController.revokeOtherSessions());
router.delete(routes.session, requireAuth, forms.security.SessionById.validate, SecurityController.revokeSession());

router.get(routes.twoFactor, requireAuth, SecurityController.twoFactorStatus());
router.post(routes.twoFactorSetup, requireAuth, blockDemo, forms.security.CurrentPassword.validate, SecurityController.startTwoFactor());
router.post(routes.twoFactorEnable, requireAuth, blockDemo, forms.security.Code.validate, SecurityController.enableTwoFactor());
router.post(routes.twoFactorDisable, requireAuth, blockDemo, forms.security.PasswordAndCode.validate, SecurityController.disableTwoFactor());
router.post(routes.recoveryCodes, requireAuth, blockDemo, forms.security.PasswordAndCode.validate, SecurityController.regenerateRecoveryCodes());

router.get(routes.exportData, requireAuth, SecurityController.exportData());

router.delete(routes.account, requireAuth, blockDemo, forms.security.DeleteAccount.validate, SecurityController.deleteAccount());

export default router;
