import { Router } from "express";
import SimulationController from "../controllers/SimulationController.js";
import forms from "../forms/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = SimulationController;
const f = forms.routine;

router.get(routes.list, requireAuth, SimulationController.list());
router.get(routes.current, requireAuth, SimulationController.current());
router.post(routes.list, requireAuth, f.CreateSimulation.validate, SimulationController.create());
router.get(routes.one, requireAuth, forms.shared.ById.validate, SimulationController.get());
router.patch(routes.one, requireAuth, f.UpdateSimulation.validate, SimulationController.update());
router.delete(routes.one, requireAuth, forms.shared.ById.validate, SimulationController.remove());
router.post(routes.apply, requireAuth, f.ApplySimulation.validate, SimulationController.apply());

export default router;
