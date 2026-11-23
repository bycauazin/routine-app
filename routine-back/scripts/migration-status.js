/**
 * Read-only: shows the migrations that failed or are unfinished in a database,
 * with the error Prisma stored, and which parts of the latest migration exist.
 *
 *   npm run db:status:prod                                        (production)
 *   node --env-file=.env scripts/migration-status.js              (local)
 */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL?.replace(/[?&]schema=[^&]*/, "") });
await client.connect();
try {
  const { host, pathname } = new URL(process.env.DATABASE_URL);
  console.log(`\nBanco: ${host}${pathname}\n`);

  const failed = await client.query(
    "SELECT migration_name, started_at, applied_steps_count, logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at",
  );
  if (failed.rows.length === 0) console.log("✔ Nenhuma migração com falha pendente.\n");
  for (const m of failed.rows) {
    console.log(`✖ ${m.migration_name} (início ${m.started_at.toISOString()}, passos aplicados: ${m.applied_steps_count})`);
    console.log(m.logs ?? "(sem log: o processo parou antes de terminar)");
    console.log();
  }
  const history = await client.query("SELECT count(*)::int AS n FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL");
  if (history.rows[0].n > 0) console.log(`(${history.rows[0].n} tentativa(s) antiga(s) marcada(s) como desfeita(s): só histórico)\n`);

  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'two_factor%' ORDER BY 1");
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('recovery_codes', 'request_counters') ORDER BY 1");
  const purposes = await client.query(`SELECT unnest(enum_range(NULL::"AuthTokenPurpose"))::text AS v`);
  const version = await client.query("SHOW server_version");
  console.log("Colunas em users:", cols.rows.map((r) => r.column_name).join(", ") || "nenhuma");
  console.log("Tabelas novas:", tables.rows.map((r) => r.table_name).join(", ") || "nenhuma");
  console.log("AuthTokenPurpose:", purposes.rows.map((r) => r.v).join(", "));
  console.log("PostgreSQL:", version.rows[0].server_version);
} finally {
  await client.end();
}
