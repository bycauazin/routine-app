/**
 * Creates a user (the first one should be the admin). No credentials live in
 * the repository: they are typed interactively (password hidden) or passed
 * through environment variables for automated setups:
 *
 *   npm run user:create                      # interactive
 *   npm run user:create -- --role=USER       # create a regular user
 *   ROUTINE_USER_EMAIL=… ROUTINE_USER_NAME=… ROUTINE_USER_PASSWORD=… npm run user:create
 */
import readline from "node:readline";
import { z } from "zod";
import { emailSchema, newPasswordSchema } from "../src/forms/shared/schemas.js";
import UserService from "../src/services/UserService.js";
import { prisma } from "../src/database/prisma.js";

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Print the prompt once, then swallow the echoed characters.
      rl._writeToOutput = (text) => {
        if (text.includes(question)) process.stdout.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const roleArg = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1] ?? "ADMIN";
  const role = z.enum(["ADMIN", "USER"]).parse(roleArg);

  const email = process.env.ROUTINE_USER_EMAIL ?? (await ask("E-mail: "));
  const name = process.env.ROUTINE_USER_NAME ?? (await ask("Nome: "));
  let password = process.env.ROUTINE_USER_PASSWORD;
  if (!password) {
    password = await ask("Senha (mín. 10 caracteres): ", { hidden: true });
    const confirmation = await ask("Confirme a senha: ", { hidden: true });
    if (password !== confirmation) throw new Error("As senhas não conferem.");
  }

  const input = z
    .object({ email: emailSchema, name: z.string().trim().min(1).max(80), password: newPasswordSchema })
    .parse({ email, name, password });

  const user = await UserService.create({ ...input, role });
  console.log(`\n✔ Usuário criado: ${user.email} (${user.role}). Categorias padrão adicionadas.`);
}

main()
  .catch((error) => {
    const message = error instanceof z.ZodError ? error.issues.map((i) => i.message).join("\n") : error.message;
    console.error(`\n✖ ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
