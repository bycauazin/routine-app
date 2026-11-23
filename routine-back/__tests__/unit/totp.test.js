import { describe, expect, it } from "vitest";
import TotpService, { base32Encode, hotp } from "../../src/services/security/TotpService.js";

// RFC 6238 appendix B: SHA-1 key "12345678901234567890".
const RFC_KEY = Buffer.from("12345678901234567890", "ascii");

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors (last 6 digits)", () => {
    expect(hotp(RFC_KEY, TotpService.stepAt(59_000))).toBe("287082");
    expect(hotp(RFC_KEY, TotpService.stepAt(1_111_111_109_000))).toBe("081804");
    expect(hotp(RFC_KEY, TotpService.stepAt(1_234_567_890_000))).toBe("005924");
    expect(hotp(RFC_KEY, TotpService.stepAt(2_000_000_000_000))).toBe("279037");
  });

  it("encodes the key in base32 like the authenticator apps", () => {
    expect(base32Encode(RFC_KEY)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Encode(Buffer.from("f"))).toBe("MY");
  });

  it("accepts the current step and its neighbours, and never a step already used", () => {
    const timeMs = 1_700_000_000_000;
    const step = TotpService.stepAt(timeMs);
    expect(TotpService.match(RFC_KEY, hotp(RFC_KEY, step), { timeMs })).toBe(step);
    expect(TotpService.match(RFC_KEY, hotp(RFC_KEY, step - 1), { timeMs })).toBe(step - 1);
    expect(TotpService.match(RFC_KEY, hotp(RFC_KEY, step + 1), { timeMs })).toBe(step + 1);
    expect(TotpService.match(RFC_KEY, hotp(RFC_KEY, step - 2), { timeMs })).toBeNull();
    expect(TotpService.match(RFC_KEY, hotp(RFC_KEY, step), { timeMs, afterStep: step })).toBeNull();
    expect(TotpService.match(RFC_KEY, "12345", { timeMs })).toBeNull();
    expect(TotpService.match(RFC_KEY, "abcdef", { timeMs })).toBeNull();
  });

  it("builds the otpauth address read by the QR code", () => {
    const url = new URL(TotpService.otpauthUrl(RFC_KEY, "ana@example.com"));
    expect(url.protocol).toBe("otpauth:");
    expect(url.host).toBe("totp");
    expect(decodeURIComponent(url.pathname)).toBe("/Routine:ana@example.com");
    expect(url.searchParams.get("secret")).toBe(base32Encode(RFC_KEY));
    expect(url.searchParams.get("issuer")).toBe("Routine");
  });

  it("makes recovery codes without look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = TotpService.generateRecoveryCode();
      expect(code).toMatch(/^[a-hj-km-np-z2-9]{5}-[a-hj-km-np-z2-9]{5}$/);
      expect(TotpService.normalizeRecoveryCode(code.toUpperCase().replace("-", " - "))).toBe(code.replace("-", ""));
    }
  });
});
