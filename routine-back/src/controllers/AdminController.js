import AdminService from "../services/AdminService.js";
import { BaseController } from "./BaseController.js";

/** "Configurações → Usuários" (admins only). */
class AdminController extends BaseController {
  get routes() {
    return {
      users: "/admin/users",
      user: "/admin/users/:id",
      approve: "/admin/users/:id/approve",
    };
  }

  listUsers() {
    return async (_req, res) => this.ok(res, await AdminService.listUsers());
  }

  approve() {
    return async (req, res) => {
      await AdminService.approve(this.userId(req), req.validated.params.id);
      this.noContent(res);
    };
  }

  remove() {
    return async (req, res) => {
      await AdminService.remove(this.userId(req), req.validated.params.id);
      this.noContent(res);
    };
  }
}

export default new AdminController();
