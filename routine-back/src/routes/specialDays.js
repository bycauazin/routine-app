import { Router } from "express";
import SpecialDayController from "../controllers/SpecialDayController.js";
import forms from "../forms/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = SpecialDayController;

router.get(routes.list, requireAuth, forms.routine.ListSpecialDays.validate, SpecialDayController.list());
router.post(routes.list, requireAuth, forms.routine.CreateSpecialDay.validate, SpecialDayController.create());
router.delete(routes.one, requireAuth, forms.shared.ById.validate, SpecialDayController.remove());

export default router;
