/**
 * Vercel entry. vercel.json sends every /api/* request here, to the same
 * Express app that `npm run dev` runs locally (routine-back). The URL is not
 * changed by the rewrite, so Express still sees /api/v1/...
 *
 * Settings come from the Vercel project's Environment Variables (never from a
 * file). Vercel is a proxy in front of the function, so the client IP is read
 * from its forwarded header.
 */
process.env.NODE_ENV = "production";
process.env.TRUST_PROXY ??= "true";

// Imported after the lines above: env.js reads them when it loads.
const { createApp } = await import("../routine-back/src/app.js");

export default createApp();
