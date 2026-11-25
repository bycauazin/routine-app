import CategoryService from "../services/CategoryService.js";
import DayService from "../services/DayService.js";
import RoutineSettingsService from "../services/RoutineSettingsService.js";
import RuleService from "../services/RuleService.js";
import { BaseController } from "./BaseController.js";

/** Categories, fixed rules, the day and the week (stages 2 and 3). */
class RoutineController extends BaseController {
  get routes() {
    return {
      categories: "/categories",
      category: "/categories/:id",
      rules: "/rules",
      rule: "/rules/:id",
      ruleSplit: "/rules/:id/split",
      routineSettings: "/routine-settings",
      day: "/days/:date",
      dayMode: "/days/:date/mode",
      dayItems: "/days/:date/items",
      week: "/weeks/:date",
      tasks: "/tasks",
      itemSteps: "/day-items/:id/steps",
      itemStep: "/day-items/:id/steps/:stepId",
      item: "/day-items/:id",
      itemStatus: "/day-items/:id/status",
      itemShift: "/day-items/:id/shift",
    };
  }

  listCategories() {
    return async (req, res) => this.ok(res, await CategoryService.list(this.userId(req), req.validated.query));
  }

  createCategory() {
    return async (req, res) => this.created(res, await CategoryService.create(this.userId(req), req.validated.body));
  }

  updateCategory() {
    return async (req, res) => this.ok(res, await CategoryService.update(this.userId(req), req.validated.params.id, req.validated.body));
  }

  removeCategory() {
    return async (req, res) => {
      await CategoryService.remove(this.userId(req), req.validated.params.id);
      this.noContent(res);
    };
  }

  listRules() {
    return async (req, res) => this.ok(res, await RuleService.list(this.userId(req)));
  }

  createRule() {
    return async (req, res) => this.created(res, await RuleService.create(this.userId(req), req.validated.body));
  }

  updateRule() {
    return async (req, res) => this.ok(res, await RuleService.update(this.userId(req), req.validated.params.id, req.validated.body));
  }

  removeRule() {
    return async (req, res) => {
      await RuleService.remove(this.userId(req), req.validated.params.id, req.validated.query);
      this.noContent(res);
    };
  }

  getSettings() {
    return async (req, res) => this.ok(res, await RoutineSettingsService.get(this.userId(req)));
  }

  updateSettings() {
    return async (req, res) => this.ok(res, await RoutineSettingsService.update(this.userId(req), req.validated.body));
  }

  getWeek() {
    return async (req, res) => this.ok(res, await DayService.week(this.userId(req), req.validated.params.date));
  }

  setDayMode() {
    return async (req, res) => this.ok(res, await DayService.setMode(this.userId(req), req.validated.params.date, req.validated.body.mode));
  }

  createTask() {
    return async (req, res) => this.created(res, await DayService.createOneOff(this.userId(req), null, { ...req.validated.body, kind: "TASK" }));
  }

  splitRule() {
    return async (req, res) => this.created(res, await RuleService.split(this.userId(req), req.validated.params.id, req.validated.body));
  }

  setSteps() {
    return async (req, res) => this.ok(res, await DayService.setSteps(this.userId(req), req.validated.params.id, req.validated.body));
  }

  setStep() {
    return async (req, res) => this.ok(res, await DayService.setStep(this.userId(req), req.validated.params.id, req.validated.params.stepId, req.validated.body));
  }

  getDay() {
    return async (req, res) => this.ok(res, await DayService.get(this.userId(req), req.validated.params.date));
  }

  createOneOff() {
    return async (req, res) => this.created(res, await DayService.createOneOff(this.userId(req), req.validated.params.date, req.validated.body));
  }

  setItemStatus() {
    return async (req, res) => this.ok(res, await DayService.setStatus(this.userId(req), req.validated.params.id, req.validated.body));
  }

  updateItem() {
    return async (req, res) => this.ok(res, await DayService.update(this.userId(req), req.validated.params.id, req.validated.body));
  }

  shiftItem() {
    return async (req, res) => this.ok(res, await DayService.shift(this.userId(req), req.validated.params.id, req.validated.body));
  }

  removeItem() {
    return async (req, res) => {
      await DayService.remove(this.userId(req), req.validated.params.id);
      this.noContent(res);
    };
  }
}

export default new RoutineController();
