/**
 * Copies every record from the database in .env (DATABASE_URL) to another
 * database whose tables already exist (e.g. production on Neon):
 *
 *   $env:TARGET_DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
 *   npm run db:copy
 *   Remove-Item Env:TARGET_DATABASE_URL
 *
 * - The target must have the same migrations applied (npm run db:deploy) and
 *   no users yet: this never overwrites or mixes data.
 * - Sign-in sessions, e-mail links and login attempts are not copied (they
 *   are tied to this machine's AUTH_SECRET). With a different AUTH_SECRET in
 *   production, sign in there with "Esqueci minha senha".
 * - Everything goes in one transaction: either all of it is copied or nothing.
 * - The data goes straight from pg_dump to psql; no file is written.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const SKIPPED_TABLES = ["_prisma_migrations", "sessions", "auth_tokens", "login_attempts"];

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

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url });
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

async function tableCounts(client) {
  const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const counts = {};
  for (const { tablename } of rows) {
    if (SKIPPED_TABLES.includes(tablename)) continue;
    const result = await client.query(`SELECT count(*)::int AS n FROM "${tablename}"`);
    counts[tablename] = result.rows[0].n;
  }
  return counts;
}

async function migrations(client) {
  const { rows } = await client.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name");
  return rows.map((r) => r.migration_name).join("\n");
}

/** `?schema=public` is a Prisma option; pg_dump/psql (libpq) refuse unknown URL parameters. */
function libpqUrl(url) {
  const u = new URL(url);
  u.searchParams.delete("schema");
  return u.toString();
}

function run(pgDump, psql, sourceUrl, targetUrl) {
  const [source, target] = [libpqUrl(sourceUrl), libpqUrl(targetUrl)];
  return new Promise((resolve, reject) => {
    const excludes = SKIPPED_TABLES.flatMap((t) => ["--exclude-table", `public.${t}`]);
    const dump = spawn(pgDump, ["--data-only", "--no-owner", "--no-privileges", "--schema", "public", ...excludes, "--dbname", source], { stdio: ["ignore", "pipe", "pipe"] });
    // pg_dump warns about categories.parent_id pointing at the same table. Harmless here:
    // each table is one COPY and its foreign keys are checked at the end of it.
    let circularWarning = false;
    dump.stderr.setEncoding("utf8").on("data", (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (!line) continue;
        if (line.includes("circular foreign-key")) circularWarning = true;
        else if (!(circularWarning && /^pg_dump: (detail|hint):/.test(line))) process.stderr.write(`${line}\n`);
      }
    });
    const load = spawn(psql, ["--quiet", "--no-psqlrc", "--single-transaction", "--set", "ON_ERROR_STOP=1", "--dbname", target], { stdio: ["pipe", "ignore", "inherit"] });
    dump.stdout.pipe(load.stdin);
    let dumpCode;
    dump.on("close", (code) => {
      dumpCode = code;
      if (code !== 0) load.kill();
    });
    load.on("close", (code) => {
      if (dumpCode !== 0) reject(new Error("pg_dump falhou ao ler o banco de origem (nada foi gravado no destino)."));
      else if (code !== 0) reject(new Error("psql falhou ao gravar no destino; a transação foi desfeita e nada foi gravado."));
      else resolve();
    });
  });
}

async function main() {
  const source = process.env.DATABASE_URL;
  const target = process.env.TARGET_DATABASE_URL;
  if (!source) fail("DATABASE_URL (origem) não está no .env.");
  if (!target) fail('Defina o destino antes: $env:TARGET_DATABASE_URL="postgresql://..."');
  if (source === target) fail("Origem e destino são o mesmo banco.");

  console.log(`\nOrigem:  ${describe(source)}\nDestino: ${describe(target)}\n`);

  const [sourceMigrations, sourceCounts] = await withClient(source, async (c) => [await migrations(c), await tableCounts(c)]);
  await withClient(target, async (c) => {
    const exists = await c.query("SELECT to_regclass('public._prisma_migrations') AS t");
    if (!exists.rows[0].t) fail("O destino não tem as tabelas. Rode antes: npm run db:deploy (com DATABASE_URL apontando para o destino).");
    if ((await migrations(c)) !== sourceMigrations) fail("As migrações do destino são diferentes das da origem. Rode npm run db:deploy nos dois.");
    const users = await c.query("SELECT count(*)::int AS n FROM users");
    if (users.rows[0].n > 0) fail("O destino já tem usuários. Para não misturar dados, a cópia só roda num banco vazio.");
  });

  console.log("Copiando...");
  await run(findTool("pg_dump"), findTool("psql"), source, target);

  const targetCounts = await withClient(target, tableCounts);
  let ok = true;
  for (const [table, n] of Object.entries(sourceCounts)) {
    const same = targetCounts[table] === n;
    ok &&= same;
    console.log(`  ${same ? "✔" : "✖"} ${table.padEnd(26)} ${n}${same ? "" : ` → ${targetCounts[table]}`}`);
  }
  if (!ok) fail("Alguma tabela ficou com quantidade diferente. Confira acima.");
  console.log('\n✔ Dados copiados. No site publicado, entre com "Esqueci minha senha" (o AUTH_SECRET de lá é outro).\n');
}

main().catch((error) => fail(error.message));
