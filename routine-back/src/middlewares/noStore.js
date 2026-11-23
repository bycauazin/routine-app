/** Every API response is private, per-user data: never cache it. */
export function noStore(_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}
