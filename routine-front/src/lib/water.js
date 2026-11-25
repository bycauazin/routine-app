/** "1,2 L", "800 ml", "2 L": water amounts in Brazilian Portuguese. */
export function liters(ml) {
  if (ml < 1000) return `${ml} ml`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(ml / 1000)} L`;
}
