import { Router } from "express";
import AdminController from "../controllers/AdminController.js";
import forms from "../forms/index.js";
import { requireAdmin, requireAuth } from "../middlewares/auth.js";

/** Admins only; anyone else gets 404 (the routes' existence is not revealed). */
const router = Router();
const { routes } = AdminController;

router.get(routes.users, requireAuth, requireAdmin, AdminController.listUsers());
router.post(routes.approve, requireAuth, requireAdmin, forms.shared.ById.validate, AdminController.approve());
router.delete(routes.user, requireAuth, requireAdmin, forms.shared.ById.validate, AdminController.remove());

export default router;
