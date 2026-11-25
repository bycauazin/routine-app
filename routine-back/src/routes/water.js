import { Router } from "express";
import WaterController from "../controllers/WaterController.js";
import forms from "../forms/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = WaterController;
const f = forms.routine;

// Fixed paths before "/water/:date".
router.delete(routes.last, requireAuth, f.UndoWater.validate, WaterController.undoLast());
router.patch(routes.goal, requireAuth, f.SetWaterGoal.validate, WaterController.setGoal());
router.delete(routes.log, requireAuth, forms.shared.ById.validate, WaterController.remove());
router.post(routes.logs, requireAuth, f.AddWater.validate, WaterController.add());
router.get(routes.day, requireAuth, f.WaterDay.validate, WaterController.day());

export default router;
