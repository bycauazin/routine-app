/**
 * Makes the LOCAL database a copy of production (to start over from the real
 * data after a mix-up while testing locally):
 *
 *   npm run db:pull:prod
 *
 * - Source: DATABASE_URL of .env.production (only read). Target: DATABASE_URL
 *   of .env, which must be on this machine (localhost) — never production.
 * - Both must have the same migrations (npm run db:deploy:prod first).
 * - One transaction: the local data is erased and the copy loaded together;
 *   if anything fails, the local database stays exactly as it was.
 * - Your LOCAL password and two-factor setting are kept (production uses
 *   another AUTH_SECRET, so its password hashes would not work here).
 * - Sign-in sessions, e-mail links and login attempts are not copied: sign in
 *   again on the local site.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import pg from "pg";

const SKIPPED_TABLES = ["_prisma_migrations", "sessions", "auth_tokens", "login_attempts"];
const KEPT_LOGIN = ["password_hash", "two_factor_secret", "two_factor_enabled_at", "two_factor_last_step"];

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** pg_dump/psql from PATH or from the newest "C:\Program Files\PostgreSQL\<n>\bin". */
function findTool(name) {
  if (spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0) return name;
  const root = "C:\\Program Files\\PostgreSQL";
  if (existsSync(root)) {
    const versions = readdirSync(root).filter((v) => /^\d+$/.test(v)).sort((a, b) => b - a);
    for (const version of versions) {
      const exe = path.join(root, version, "bin", `${name}.exe`);
      if (existsSync(exe)) return exe;
    }
  }
  fail(`${name} não encontrado. Ele vem com a instalação do PostgreSQL.`);
}

/** `?schema=public` is a Prisma option; pg_dump/psql (libpq) refuse unknown URL parameters. */
function libpqUrl(url) {
  const u = new URL(url);
  u.searchParams.delete("schema");
  return u.toString();
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: libpqUrl(url) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const describe = (url) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

async function migrations(client) {
  const { rows } = await client.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name");
  return rows.map((r) => r.migration_name).join("\n");
}

async function dataTables(client) {
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  return rows.map((r) => r.tablename).filter((t) => t !== "_prisma_migrations");
}

async function tableCounts(client, tables) {
  const counts = {};
  for (const t of tables) counts[t] = (await client.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n;
  return counts;
}

const literal = (v) => (v === null || v === undefined ? "NULL" : `'${String(v instanceof Date ? v.toISOString() : v).replace(/'/g, "''")}'`);

/** Erase the local data, load production's and put the local logins back — all in one psql transaction. */
function run(pgDump, psql, source, target, tables, logins) {
  return new Promise((resolve, reject) => {
    const excludes = SKIPPED_TABLES.flatMap((t) => ["--exclude-table", `public.${t}`]);
    const dump = spawn(pgDump, ["--data-only", "--no-owner", "--no-privileges", "--schema", "public", ...excludes, "--dbname", libpqUrl(source)], { stdio: ["ignore", "pipe", "pipe"] });
    let circularWarning = false;
    dump.stderr.setEncoding("utf8").on("data", (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (!line) continue;
        if (line.includes("circular foreign-key")) circularWarning = true;
        else if (!(circularWarning && /^pg_dump: (detail|hint):/.test(line))) process.stderr.write(`${line}\n`);
      }
    });
    const load = spawn(psql, ["--quiet", "--no-psqlrc", "--single-transaction", "--set", "ON_ERROR_STOP=1", "--dbname", libpqUrl(target)], { stdio: ["pipe", "ignore", "inherit"] });
    load.stdin.write(`TRUNCATE ${tables.map((t) => `public."${t}"`).join(", ")} CASCADE;\n`);
    dump.stdout.pipe(load.stdin, { end: false });
    dump.stdout.on("end", () => {
      for (const u of logins) {
        const sets = KEPT_LOGIN.map((c) => `${c} = ${literal(u[c])}`).join(", ");
        load.stdin.write(`UPDATE public.users SET ${sets} WHERE email = ${literal(u.email)};\n`);
      }
      load.stdin.end();
    });
    let dumpCode;
    dump.on("close", (code) => {
      dumpCode = code;
      if (code !== 0) load.kill();
    });
    load.on("close", (code) => {
      if (dumpCode !== 0) reject(new Error("pg_dump falhou ao ler a produção (nada mudou no banco local)."));
      else if (code !== 0) reject(new Error("psql falhou ao gravar no banco local; a transação foi desfeita e o banco local ficou como estava."));
      else resolve();
    });
  });
}

async function main() {
  const source = process.env.DATABASE_URL;
  if (!source) fail("DATABASE_URL não está no .env.production.");
  if (!existsSync(".env")) fail("Não achei o .env do banco local (rode dentro de routine-back).");
  const target = parseEnv(readFileSync(".env", "utf8")).DATABASE_URL;
  if (!target) fail("DATABASE_URL não está no .env.");
  const host = new URL(target).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) fail(`O destino (${describe(target)}) não é um banco desta máquina. Por segurança, só copio para localhost.`);
  if (libpqUrl(source) === libpqUrl(target)) fail("Origem e destino são o mesmo banco.");

  console.log(`\nOrigem (só leitura): ${describe(source)}\nDestino (será substituído): ${describe(target)}\n`);

  const sourceMigrations = await withClient(source, migrations);
  const { tables, logins } = await withClient(target, async (c) => {
    if ((await migrations(c)) !== sourceMigrations) fail("As migrações da produção e do local são diferentes. Rode antes: npm run db:deploy:prod");
    const users = await c.query(`SELECT email, ${KEPT_LOGIN.join(", ")} FROM users`);
    return { tables: await dataTables(c), logins: users.rows };
  });
  const copied = tables.filter((t) => !SKIPPED_TABLES.includes(t));
  const sourceCounts = await withClient(source, (c) => tableCounts(c, copied));

  console.log("Copiando a produção para o banco local...");
  await run(findTool("pg_dump"), findTool("psql"), source, target, tables, logins);

  const targetCounts = await withClient(target, (c) => tableCounts(c, copied));
  let ok = true;
  for (const [table, n] of Object.entries(sourceCounts)) {
    const same = targetCounts[table] === n;
    ok &&= same;
    console.log(`  ${same ? "✔" : "✖"} ${table.padEnd(26)} ${n}${same ? "" : ` → ${targetCounts[table]}`}`);
  }
  if (!ok) fail("Alguma tabela ficou com quantidade diferente. Confira acima.");
  console.log("\n✔ O banco local agora é igual ao de produção. Entre de novo no site local (com a sua senha local).\n");
}

main().catch((error) => fail(error.message));
