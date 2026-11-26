import TelegramController from "./controllers/TelegramController.js";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { loadSession } from "./middlewares/auth.js";
import { csrfProtection } from "./middlewares/csrf.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { noStore } from "./middlewares/noStore.js";
import { apiRateLimit } from "./middlewares/rateLimit.js";
import routes from "./routes/index.js";

/** Builds the Express app without listening (tests drive it with supertest). */
export function createApp() {
  const app = express()
  
  
  ;

  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", 1);

  // The API serves only JSON: lock everything else down.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ meta: { success: true }, data: { status: "ok" } }));
  // Called by Telegram's servers (secret header, no session or CSRF): see TelegramController.webhook.
  app.post("/api/telegram/webhook", TelegramController.webhook());
  app.get("/api/cron/morning", TelegramController.morning());
  app.use("/api/v1", noStore, apiRateLimit, csrfProtection, loadSession, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
