import WaterService from "../services/WaterService.js";
import { BaseController } from "./BaseController.js";

/** Water (stage 4). */
class WaterController extends BaseController {
  get routes() {
    return { day: "/water/:date", logs: "/water", last: "/water/last", log: "/water/logs/:id", goal: "/water/goal" };
  }

  day() {
    return async (req, res) => this.ok(res, await WaterService.day(this.userId(req), req.validated.params.date));
  }

  add() {
    return async (req, res) => this.created(res, await WaterService.add(this.userId(req), req.validated.body));
  }

  undoLast() {
    return async (req, res) => this.ok(res, await WaterService.undoLast(this.userId(req), req.validated.query));
  }

  remove() {
    return async (req, res) => this.ok(res, await WaterService.remove(this.userId(req), req.validated.params.id));
  }

  setGoal() {
    return async (req, res) => this.ok(res, await WaterService.setGoal(this.userId(req), req.validated.body));
  }
}

export default new WaterController();
