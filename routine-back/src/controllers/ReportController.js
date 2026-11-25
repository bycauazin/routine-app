import DayService from "../services/DayService.js";
import GoalService from "../services/GoalService.js";
import ReportService from "../services/ReportService.js";
import { BaseController } from "./BaseController.js";

class ReportController extends BaseController {
  report = async (req, res) => this.ok(res, await ReportService.report(this.userId(req), req.validated.query));
  pending = async (req, res) => this.ok(res, await ReportService.pending(this.userId(req), req.validated.query));
  review = async (req, res) => {
    const { ids, status } = req.validated.body;
    await DayService.review(this.userId(req), req.validated.params.date, ids, status);
    this.noContent(res);
  };
  goals = async (req, res) => this.ok(res, await GoalService.list(this.userId(req)));
  candidates = async (req, res) => this.ok(res, await GoalService.candidates(this.userId(req)));
  create = async (req, res) => this.created(res, await GoalService.save(this.userId(req), req.validated.body));
  update = async (req, res) => this.ok(res, await GoalService.save(this.userId(req), req.validated.body, req.validated.params.id));
  remove = async (req, res) => {
    await GoalService.remove(this.userId(req), req.validated.params.id);
    this.noContent(res);
  };
}

export default new ReportController();
