import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Keys derived from AUTH_SECRET, one per use, so the same secret never plays
 * two roles. Changing AUTH_SECRET invalidates every password and token.
 */
const derive = (label) => createHmac("sha256", env.AUTH_SECRET).update(label).digest();

/** Mixed into Argon2 (the "pepper"): a stolen database alone cannot be cracked. */
export const PASSWORD_PEPPER = derive("routine:password-pepper:v1");

const TOKEN_KEY = derive("routine:token-hmac:v1");
const SEAL_KEY = derive("routine:seal-aes-256-gcm:v1");

/**
 * How random tokens (session cookie, e-mail links, recovery codes) are stored:
 * HMAC-SHA256 with the server key, so the database never holds a usable token.
 * @param {string} token
 */
export function tokenDigest(token) {
  return createHmac("sha256", TOKEN_KEY).update(token).digest("hex");
}

/**
 * Encrypts a secret the server must read back later (the authenticator app
 * key): AES-256-GCM, so a copy of the database alone does not reveal it and
 * any tampering is detected. Format: "v1.<iv>.<tag>.<ciphertext>" (base64url).
 * @param {Buffer} plain
 */
export function seal(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", SEAL_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** @param {string} sealed @returns {Buffer} */
export function unseal(sealed) {
  const [version, iv, tag, ciphertext] = String(sealed).split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Unknown sealed format");
  const decipher = createDecipheriv("aes-256-gcm", SEAL_KEY, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
}
