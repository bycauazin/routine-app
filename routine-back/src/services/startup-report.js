import { styleText } from "node:util";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import logger from "./logger.js";

/**
 * What the API says when it starts. In development it prints a short, readable
 * panel (address, database, e-mail, sign-up); elsewhere it logs the same facts
 * as JSON lines, which hosting dashboards can search.
 *
 * Never prints secrets: the database shows only host and name, never the user
 * or password from DATABASE_URL.
 */
export async function reportStartup() {
  const database = await checkDatabase();
  const mail = describeMail();

  if (env.NODE_ENV !== "development") {
    logger.info("routine-back listening", { port: env.PORT, env: env.NODE_ENV, mail: env.MAIL_PROVIDER, signup: env.SIGNUP_ENABLED });
    if (database.ok) logger.info("Database connected", { target: database.target });
    else logger.error("Database unreachable", { target: database.target, code: database.code });
    return;
  }

  const ok = styleText("green", "✔");
  const fail = styleText("red", "✖");
  const info = styleText("cyan", "➜");
  const dim = (text) => styleText("dim", text);
  const label = (text) => styleText("bold", text.padEnd(10));

  const lines = [
    "",
    `  ${styleText(["bold", "green"], "Routine API")} ${dim("rodando em desenvolvimento")}`,
    "",
    `  ${info} ${label("API")}${styleText("cyan", `http://localhost:${env.PORT}`)}`,
    `  ${info} ${label("Site")}${styleText("cyan", env.APP_ORIGIN)} ${dim("(abra este no navegador)")}`,
    "",
    database.ok
      ? `  ${ok} ${label("Banco")}conectado ${dim(`(${database.target})`)}`
      : `  ${fail} ${label("Banco")}${styleText("red", "não conectou")} ${dim(`(${database.target}${database.code ? ` · ${database.code}` : ""})`)}\n` +
        `    ${dim("O PostgreSQL está ligado? Confira DATABASE_URL no .env.")}`,
    `  ${ok} ${label("E-mail")}${mail}`,
    `  ${ok} ${label("Cadastro")}${env.SIGNUP_ENABLED ? "aberto" : `fechado ${dim("(só npm run user:create)")}`}`,
    "",
    `  ${dim("Salvar um arquivo reinicia sozinho · Ctrl+C para parar")}`,
    "",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

/** Runs one tiny query, so a wrong DATABASE_URL shows up now and not on the first login. */
async function checkDatabase() {
  const target = databaseTarget();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, target };
  } catch (error) {
    return { ok: false, target, code: error?.code ?? error?.cause?.code };
  }
}

/** "host:port/name" from DATABASE_URL, without the user or password. */
function databaseTarget() {
  try {
    const url = new URL(env.DATABASE_URL);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "DATABASE_URL inválida";
  }
}

function describeMail() {
  if (env.MAIL_PROVIDER === "gmail") return `Gmail ${styleText("dim", `(${env.MAIL_FROM})`)}`;
  if (env.MAIL_PROVIDER === "resend") return `Resend ${styleText("dim", `(${env.MAIL_FROM})`)}`;
  return `aparece aqui no terminal ${styleText("dim", "(MAIL_PROVIDER=console, nada é enviado)")}`;
}
