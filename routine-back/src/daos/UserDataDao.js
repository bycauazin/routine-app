import { prisma } from "../database/prisma.js";

/**
 * Everything stored for one user, for "Baixar meus dados" (LGPD, art. 18).
 * Secrets are left out: password hash, 2FA key, sessions, tokens, recovery codes.
 * Every new user-owned table is added here.
 */
class UserDataDao {
  async exportAll(userId) {
    const where = { where: { userId } };
    const byDate = { ...where, orderBy: { createdAt: "asc" } };
    const [user, settings, auditLogs] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
          onboardingCompletedAt: true,
          twoFactorEnabledAt: true,
        },
      }),
      prisma.userSettings.findUnique(where),
      prisma.auditLog.findMany(byDate),
    ]);
    return { user, settings, auditLogs };
  }
}

export default new UserDataDao();
