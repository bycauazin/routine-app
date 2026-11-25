import { Router } from "express";
import RoutineController from "../controllers/RoutineController.js";
import forms from "../forms/index.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = RoutineController;
const f = forms.routine;

router.get(routes.categories, requireAuth, f.ListCategories.validate, RoutineController.listCategories());
router.post(routes.categories, requireAuth, f.CreateCategory.validate, RoutineController.createCategory());
router.patch(routes.category, requireAuth, f.UpdateCategory.validate, RoutineController.updateCategory());
router.delete(routes.category, requireAuth, forms.shared.ById.validate, RoutineController.removeCategory());

router.get(routes.rules, requireAuth, RoutineController.listRules());
router.post(routes.rules, requireAuth, f.CreateRule.validate, RoutineController.createRule());
router.patch(routes.rule, requireAuth, f.UpdateRule.validate, RoutineController.updateRule());
router.delete(routes.rule, requireAuth, f.RemoveRule.validate, RoutineController.removeRule());
router.post(routes.ruleSplit, requireAuth, f.SplitRule.validate, RoutineController.splitRule());

router.get(routes.routineSettings, requireAuth, RoutineController.getSettings());
router.patch(routes.routineSettings, requireAuth, f.UpdateRoutineSettings.validate, RoutineController.updateSettings());

router.get(routes.day, requireAuth, f.DayByDate.validate, RoutineController.getDay());
router.get(routes.week, requireAuth, f.DayByDate.validate, RoutineController.getWeek());
router.put(routes.dayMode, requireAuth, f.SetDayMode.validate, RoutineController.setDayMode());
router.post(routes.tasks, requireAuth, f.CreateTask.validate, RoutineController.createTask());
router.put(routes.itemSteps, requireAuth, f.SetSteps.validate, RoutineController.setSteps());
router.patch(routes.itemStep, requireAuth, f.SetStep.validate, RoutineController.setStep());
router.post(routes.dayItems, requireAuth, f.CreateOneOff.validate, RoutineController.createOneOff());
router.patch(routes.item, requireAuth, f.UpdateItem.validate, RoutineController.updateItem());
router.patch(routes.itemStatus, requireAuth, f.SetItemStatus.validate, RoutineController.setItemStatus());
router.post(routes.itemShift, requireAuth, f.ShiftItem.validate, RoutineController.shiftItem());
router.delete(routes.item, requireAuth, forms.shared.ById.validate, RoutineController.removeItem());

export default router;
