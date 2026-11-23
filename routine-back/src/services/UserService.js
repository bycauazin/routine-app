import UserDao from "../daos/UserDao.js";
import { withTransaction } from "../database/transaction.js";
import { ConflictError, isUniqueViolation } from "../shared/errors.js";
import AuditService from "./AuditService.js";
import PasswordService from "./security/PasswordService.js";

class UserService {
  /**
   * Creates a user with settings, atomically.
   * `verified: true` (the `user:create` script) can sign in right away;
   * the public sign-up passes `false` and waits for the e-mail confirmation.
   * The public sign-up also passes `approved: false`: an admin lets it in.
   * @param {{ email: string, name: string, password: string, role?: "ADMIN" | "USER", verified?: boolean, approved?: boolean, demoExpiresAt?: Date }} input (validated)
   */
  async create({ email, name, password, role = "USER", verified = true, approved = true, demoExpiresAt = null }) {
    const passwordHash = await PasswordService.hash(password);
    const now = new Date();
    try {
      return await withTransaction(async (tx) => {
        const user = await UserDao.createWithSettings(
          { email, name, passwordHash, role, emailVerifiedAt: verified ? now : null, approvedAt: approved ? now : null, demoExpiresAt },
          { tx },
        );
        await AuditService.record({ userId: user.id, action: "user.created", entityType: "user", entityId: user.id }, { tx });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError("Já existe um usuário com esse e-mail.");
      throw error;
    }
  }
}

export default new UserService();
