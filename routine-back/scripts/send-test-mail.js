/**
 * Sends one test e-mail with the settings in .env, to check the e-mail setup:
 *
 *   npm run mail:test -- seu-email@gmail.com
 */
import { z } from "zod";
import { env } from "../src/config/env.js";
import MailService from "../src/services/mail/MailService.js";

async function main() {
  const to = z.email().parse(process.argv[2] ?? "");
  await MailService.send({
    to,
    subject: "Teste de e-mail do Routine",
    text: "Se você recebeu este e-mail, o envio do Routine está funcionando.\n\n— Routine",
    html: "<p>Se você recebeu este e-mail, o envio do Routine está funcionando.</p><p>— Routine</p>",
  });
  console.log(env.MAIL_PROVIDER === "console" ? "\nMAIL_PROVIDER=console: o e-mail foi só mostrado acima, nada foi enviado." : `\n✔ E-mail enviado para ${to} (via ${env.MAIL_PROVIDER}). Confira a caixa de entrada e o spam.`);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof z.ZodError ? "Informe um e-mail válido: npm run mail:test -- seu-email@gmail.com" : error.message}`);
  process.exitCode = 1;
});
