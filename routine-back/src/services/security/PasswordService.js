import { hash, verify } from "@node-rs/argon2";
import { PASSWORD_PEPPER } from "./secrets.js";

// Argon2id (the library default) with OWASP-recommended parameters:
// 19 MiB memory, 2 iterations, parallelism 1. Each hash gets its own random
// salt (stored inside the hash string) plus the server pepper (`secret`).
const ARGON2_OPTIONS = Object.freeze({ memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
const WITH_PEPPER = Object.freeze({ ...ARGON2_OPTIONS, secret: PASSWORD_PEPPER });

async function safeVerify(passwordHash, password, options) {
  try {
    return await verify(passwordHash, password, options);
  } catch {
    return false;
  }
}

class PasswordService {
  /** @param {string} password */
  hash(password) {
    return hash(password, WITH_PEPPER);
  }

  /**
   * Checks a password. Hashes made before AUTH_SECRET existed (no pepper)
   * are still accepted once and flagged, so the caller re-hashes them.
   * A wrong password always costs two verifications, whatever the hash.
   * @param {string} passwordHash @param {string} password
   * @returns {Promise<{ valid: boolean, needsRehash: boolean }>}
   */
  async check(passwordHash, password) {
    if (await safeVerify(passwordHash, password, WITH_PEPPER)) return { valid: true, needsRehash: false };
    const legacy = await safeVerify(passwordHash, password, ARGON2_OPTIONS);
    return { valid: legacy, needsRehash: legacy };
  }

  /**
   * Hash verified when the e-mail does not exist, so "unknown user" and
   * "wrong password" take comparable time (no user enumeration by timing).
   */
  dummyHash() {
    this._dummy ??= this.hash(crypto.randomUUID());
    return this._dummy;
  }
}

export default new PasswordService();
