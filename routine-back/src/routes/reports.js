import { Router } from "express";
import controller from "../controllers/ReportController.js";
import forms from "../forms/index.js";
import { CreateGoal, EditGoal, ReportRange, ReviewDay } from "../forms/reports.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.get("/reports", requireAuth, ReportRange.validate, controller.report);
router.get("/reports/pending", requireAuth, ReportRange.validate, controller.pending);
router.post("/reports/pending/:date", requireAuth, ReviewDay.validate, controller.review);
router.get("/goals", requireAuth, controller.goals);
router.get("/goals/options", requireAuth, controller.candidates);
router.post("/goals", requireAuth, CreateGoal.validate, controller.create);
router.put("/goals/:id", requireAuth, EditGoal.validate, controller.update);
router.delete("/goals/:id", requireAuth, forms.shared.ById.validate, controller.remove);

export default router;
