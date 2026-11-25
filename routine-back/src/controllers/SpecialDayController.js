import SpecialDayService from "../services/SpecialDayService.js";
import { BaseController } from "./BaseController.js";

/** Dias especiais (stage 5): feriado, férias, doente. */
class SpecialDayController extends BaseController {
  get routes() {
    return { list: "/special-days", one: "/special-days/:id" };
  }

  list() {
    return async (req, res) => this.ok(res, await SpecialDayService.list(this.userId(req), req.validated.query));
  }

  create() {
    return async (req, res) => this.created(res, await SpecialDayService.create(this.userId(req), req.validated.body));
  }

  remove() {
    return async (req, res) => this.ok(res, await SpecialDayService.remove(this.userId(req), req.validated.params.id));
  }
}

export default new SpecialDayController();
