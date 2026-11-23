import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";
import { prisma } from "./src/database/prisma.js";
import logger from "./src/services/logger.js";
import { reportStartup } from "./src/services/startup-report.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  reportStartup().catch((error) => logger.error("Startup report failed", { error }));
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    if (env.NODE_ENV === "development") process.stderr.write(`
  ✖ A porta ${env.PORT} já está em uso: provavelmente outro npm run dev está aberto.
    Feche o outro terminal ou mude PORT no .env.

`);
    else logger.error("Port already in use", { port: env.PORT });
    process.exit(1);
  }
  throw error;
});

function shutdown(signal) {
  logger.info("Shutting down", { signal });
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
