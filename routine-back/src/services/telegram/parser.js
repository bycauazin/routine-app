/**
 * Rules that read a bot message (stage 7). Returns `{ intent, ... }` or
 * `{ intent: "unknown" }`; the AI fallback (7C) only sees the unknown ones.
 *
 *   "bebi 500", "tomei 1,5 l", "água 300ml"  → { intent: "water", amountMl }
 *   "resumo", "/resumo", "hoje"               → { intent: "summary" }
 *   "ajuda", "/ajuda", "/start", "/help"      → { intent: "help" }
 */
const clean = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/@\w+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** "500" → 500 ml; "1,5 l" / "1.5 litro" → 1500 ml; "2l" → 2000 ml. */
function waterAmount(number, unit) {
  const value = Number(number.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  const liters = /^l|^litro/.test(unit ?? "") || (!unit && value < 10 && number.match(/[,.]/));
  const ml = Math.round(liters ? value * 1000 : value);
  return ml >= 1 && ml <= 5000 ? ml : null;
}

export function parseMessage(text) {
  const t = clean(text);
  if (!t) return { intent: "unknown" };
  if (/^\/?(ajuda|help|start|comandos)$/.test(t)) return { intent: "help" };
  if (/^\/?(resumo|hoje|dia)$/.test(t)) return { intent: "summary" };

  const water = t.match(/^\/?(?:bebi|tomei|agua|beber)\s+(?:mais\s+)?(\d+(?:[.,]\d+)?)\s*(ml|l|litros?)?(?:\s+de\s+agua)?$/);
  if (water) {
    const amountMl = waterAmount(water[1], water[2]);
    return amountMl ? { intent: "water", amountMl } : { intent: "unknown" };
  }
  return { intent: "unknown" };
}
