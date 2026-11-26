import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Recovery codes avoid look-alike characters (0/o, 1/l/i). */
const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const STEP_SECONDS = 30;
const DIGITS = 6;

/** RFC 4648 base32 without padding: the format authenticator apps expect. */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** HOTP (RFC 4226): the 6-digit code for one counter value. */
export function hotp(key, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac("sha1", key).update(message).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Time-based codes (TOTP, RFC 6238) for two-step verification: the same
 * algorithm as Google Authenticator, Microsoft Authenticator, Authy, 1Password…
 */
class TotpService {
  /** 160 random bits, the size RFC 4226 recommends. */
  generateKey() {
    return randomBytes(20);
  }

  stepAt(timeMs = Date.now()) {
    return Math.floor(timeMs / 1000 / STEP_SECONDS);
  }

  /**
   * Checks a 6-digit code against the current step and its neighbours (clock
   * drift of up to 30 s). Steps up to `afterStep` are refused, so a code that
   * was already used does not work again.
   * @returns {number | null} the matching step, or null
   */
  match(key, code, { afterStep = -1, timeMs = Date.now() } = {}) {
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null;
    const current = this.stepAt(timeMs);
    let found = null;
    // Compare every candidate (no early exit), in constant time.
    for (const step of [current - 1, current, current + 1]) {
      const same = timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(code));
      if (same && step > afterStep && found === null) found = step;
    }
    return found;
  }

  /** Address the authenticator app reads from the QR code. */
  otpauthUrl(key, accountName, issuer = "nuCorre") {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({ secret: base32Encode(key), issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${params}`;
  }

  /** Key in groups of 4, for typing it by hand when the QR code cannot be read. */
  formatKey(key) {
    return base32Encode(key).match(/.{1,4}/g).join(" ");
  }

  /** "abcde-fghjk": 10 characters from a 31-letter alphabet (about 50 bits). */
  generateRecoveryCode() {
    const chars = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]);
    return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
  }

  /** Accepts the code with or without the dash, spaces or capitals. */
  normalizeRecoveryCode(code) {
    return String(code).toLowerCase().replace(/[^a-z0-9]/g, "");
  }
}

export default new TotpService();
