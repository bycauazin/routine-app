/**
 * Emergency only: turns off two-step verification for one account, when the
 * phone and every recovery code were lost. Run it on a machine that can reach
 * the database (for production, with DATABASE_URL pointing to it):
 *
 *   npm run user:disable-2fa -- seu-email@gmail.com
 *
 * The person signs in with the password alone and can turn 2FA on again.
 */
import { z } from "zod";
import UserDao from "../src/daos/UserDao.js";
import { prisma } from "../src/database/prisma.js";
import { emailSchema } from "../src/forms/shared/schemas.js";
import SessionService from "../src/services/security/SessionService.js";
import TwoFactorService from "../src/services/security/TwoFactorService.js";

async function main() {
  const email = emailSchema.parse(process.argv[2] ?? "");
  const user = await UserDao.findByEmail(email);
  if (!user) throw new Error("Nenhuma conta com esse e-mail.");
  if (!TwoFactorService.isEnabled(user)) throw new Error("A verificação em duas etapas já está desativada nessa conta.");
  await TwoFactorService.clear(user.id);
  const signedOut = await SessionService.invalidateUser(user.id);
  console.log(`\n✔ Verificação em duas etapas desativada para ${email}. ${signedOut} sessão(ões) encerrada(s).`);
}

main()
  .catch((error) => {
    console.error(`\n✖ ${error instanceof z.ZodError ? "Informe o e-mail: npm run user:disable-2fa -- seu-email@gmail.com" : error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
