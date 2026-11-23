/**
 * Short device name from a browser's User-Agent, for the list of signed-in
 * devices: "Chrome no Windows", "Safari no iPhone"… Unknown parts fall back to
 * generic words; it is a label, not a security check.
 * @param {string | null | undefined} ua
 */
export function describeDevice(ua) {
  if (!ua) return { name: "Aparelho desconhecido", mobile: false };
  const s = ua.toLowerCase();

  const os = s.includes("iphone")
    ? "iPhone"
    : s.includes("ipad")
      ? "iPad"
      : s.includes("android")
        ? "Android"
        : s.includes("windows")
          ? "Windows"
          : s.includes("mac os") || s.includes("macintosh")
            ? "Mac"
            : s.includes("linux")
              ? "Linux"
              : null;

  const browser = s.includes("edg/")
    ? "Edge"
    : s.includes("opr/") || s.includes("opera")
      ? "Opera"
      : s.includes("samsungbrowser")
        ? "Samsung Internet"
        : s.includes("firefox") || s.includes("fxios")
          ? "Firefox"
          : s.includes("chrome") || s.includes("crios")
            ? "Chrome"
            : s.includes("safari")
              ? "Safari"
              : null;

  const mobile = /iphone|android|mobile/.test(s) && !s.includes("ipad");
  const name = browser && os ? `${browser} no ${os}` : (browser ?? os ?? "Navegador");
  return { name, mobile };
}
