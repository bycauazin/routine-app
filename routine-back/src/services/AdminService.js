import UserDao from "../daos/UserDao.js";
import { ConflictError, NotFoundError } from "../shared/errors.js";
import AuditService from "./AuditService.js";
import AuthService from "./AuthService.js";
import logger from "./logger.js";
import * as mails from "./mail/templates.js";

const notFound = () => new NotFoundError("Usuário não encontrado.");

/**
 * "Configurações → Usuários" (admins only): who has an account, letting
 * public sign-ups in and removing accounts. Demo accounts are not listed.
 */
class AdminService {
  async listUsers() {
    const users = await UserDao.listReal();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      emailVerified: Boolean(u.emailVerifiedAt),
      approvedAt: u.approvedAt,
      twoFactorEnabled: Boolean(u.twoFactorEnabledAt),
    }));
  }

  /** Lets a waiting account in and tells its owner by e-mail. */
  async approve(adminId, userId) {
    const user = await UserDao.approve(userId);
    if (!user) {
      const existing = await UserDao.findById(userId);
      if (!existing || existing.demoExpiresAt) throw notFound();
      throw new ConflictError("Esta conta já está liberada.");
    }
    await AuditService.record({ userId: adminId, action: "admin.user_approved", entityType: "user", entityId: user.id, metadata: { email: user.email } });
    logger.info("User approved", { userId: user.id, by: adminId });
    AuthService.sendInBackground(user.email, mails.accountApproved({ name: user.name }));
  }

  /**
   * Deletes someone else's account and everything in it (refusing a sign-up
   * or removing an account). Never yourself nor another admin.
   */
  async remove(adminId, userId) {
    const user = await UserDao.findById(userId);
    if (!user || user.demoExpiresAt) throw notFound();
    if (user.id === adminId) throw new ConflictError("Para excluir a sua própria conta, use Configurações → Segurança.");
    if (user.role === "ADMIN") throw new ConflictError("Contas de administrador não podem ser excluídas por aqui.");
    await UserDao.deleteById(user.id);
    await AuditService.record({ userId: adminId, action: "admin.user_deleted", entityType: "user", entityId: user.id, metadata: { email: user.email, approved: Boolean(user.approvedAt) } });
    logger.info("User deleted by admin", { userId: user.id, by: adminId });
  }
}

export default new AdminService();
