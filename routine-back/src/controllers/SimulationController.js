import SimulationService from "../services/SimulationService.js";
import { BaseController } from "./BaseController.js";

/** Simulações: draft weekly routines (CRUD, current routine as blocks, apply). */
class SimulationController extends BaseController {
  get routes() {
    return { list: "/simulations", current: "/simulations/current", one: "/simulations/:id", apply: "/simulations/:id/apply" };
  }

  list() {
    return async (req, res) => this.ok(res, await SimulationService.list(this.userId(req)));
  }

  current() {
    return async (req, res) => this.ok(res, { blocks: await SimulationService.currentBlocks(this.userId(req)) });
  }

  get() {
    return async (req, res) => this.ok(res, await SimulationService.get(this.userId(req), req.validated.params.id));
  }

  create() {
    return async (req, res) => this.created(res, await SimulationService.create(this.userId(req), req.validated.body));
  }

  update() {
    return async (req, res) => this.ok(res, await SimulationService.update(this.userId(req), req.validated.params.id, req.validated.body));
  }

  remove() {
    return async (req, res) => {
      await SimulationService.remove(this.userId(req), req.validated.params.id);
      return this.ok(res, { removed: true });
    };
  }

  apply() {
    return async (req, res) => this.ok(res, await SimulationService.apply(this.userId(req), req.validated.params.id, req.validated.body));
  }
}

export default new SimulationController();
