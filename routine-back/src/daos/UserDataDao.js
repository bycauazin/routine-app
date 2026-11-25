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
    const [user, settings, categories, routineRules, dayItems, dayItemSteps, dayModes, waterLogs, auditLogs, personalGoals, telegram, simulations, specialDays] = await prisma.$transaction([
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
      prisma.category.findMany(byDate),
      prisma.routineRule.findMany(byDate),
      prisma.dayItem.findMany({ ...where, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
      prisma.dayItemStep.findMany({ ...where, orderBy: [{ dayItemId: "asc" }, { sortOrder: "asc" }] }),
      prisma.dayMode.findMany({ ...where, orderBy: { date: "asc" } }),
      prisma.waterLog.findMany({ ...where, orderBy: { loggedAt: "asc" } }),
      prisma.auditLog.findMany(byDate),
      prisma.personalGoal.findMany(byDate),
      prisma.telegramLink.findMany({ ...where, select: { username: true, linkedAt: true } }),
      prisma.simulation.findMany(byDate),
      prisma.specialDay.findMany(byDate),
    ]);
    return { user, settings, categories, routineRules, dayItems, dayItemSteps, dayModes, waterLogs, auditLogs, personalGoals, telegram, simulations, specialDays };
  }
}

export default new UserDataDao();
