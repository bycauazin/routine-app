import { env } from "./env.js";

/** `__Host-` prefix forces Secure + Path=/ + no Domain in production. */
export const SESSION_COOKIE = env.isProduction ? "__Host-routine_session" : "routine_session";

export const sessionCookieOptions = Object.freeze({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
  path: "/",
});
