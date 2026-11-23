import {
  Baby,
  Banknote,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Bus,
  Car,
  CircleEllipsis,
  Coins,
  CookingPot,
  CreditCard,
  Droplet,
  Dumbbell,
  Film,
  Flame,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Key,
  Landmark,
  Languages,
  Laptop,
  Lightbulb,
  Music,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  PlusCircle,
  Receipt,
  Repeat,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tag,
  TrendingUp,
  Tv,
  UserRound,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * Whitelist of icons for accounts, categories and monthly items. The API
 * stores the kebab-case name; unknown names fall back to a tag.
 */
export const ICONS = {
  // money & work
  briefcase: Briefcase,
  laptop: Laptop,
  "hand-coins": HandCoins,
  "credit-card": CreditCard,
  landmark: Landmark,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  banknote: Banknote,
  coins: Coins,
  "trending-up": TrendingUp,
  "building-2": Building2,
  // home & bills
  house: House,
  key: Key,
  wifi: Wifi,
  smartphone: Smartphone,
  lightbulb: Lightbulb,
  zap: Zap,
  droplet: Droplet,
  flame: Flame,
  tv: Tv,
  receipt: Receipt,
  // food
  "cooking-pot": CookingPot,
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  // health & care
  brain: Brain,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  pill: Pill,
  dumbbell: Dumbbell,
  scissors: Scissors,
  sparkles: Sparkles,
  // study
  "graduation-cap": GraduationCap,
  languages: Languages,
  "book-open": BookOpen,
  // leisure & subscriptions
  music: Music,
  film: Film,
  "gamepad-2": Gamepad2,
  "party-popper": PartyPopper,
  repeat: Repeat,
  // transport
  car: Car,
  fuel: Fuel,
  bus: Bus,
  plane: Plane,
  // other
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  gift: Gift,
  baby: Baby,
  "paw-print": PawPrint,
  "shield-check": ShieldCheck,
  wrench: Wrench,
  "rotate-ccw": RotateCcw,
  "plus-circle": PlusCircle,
  tag: Tag,
  "user-round": UserRound,
  "circle-ellipsis": CircleEllipsis,
};

/**
 * The same icons by theme, so the picker shows a few at a time. Each theme
 * has a color that refers to it (color psychology), and an item takes the
 * color of its icon's theme unless the user picks another one:
 *   green  income & investments (money, growth) · blue   banks & cards (trust, security)
 *   amber  home & bills (warmth, light/energy)  · orange food (appetite)
 *   teal   health (calm, care)                  · indigo study (focus, knowledge)
 *   pink   leisure & subscriptions (fun)        · cyan   transport (movement)
 *   coral  shopping (desire, impulse)           · gray   other (neutral)
 */
export const ICON_GROUPS = [
  { key: "income", label: "Renda", color: "#3fae74", icons: ["briefcase", "laptop", "banknote", "coins", "trending-up", "piggy-bank"] },
  { key: "banks", label: "Bancos e cartões", color: "#578cff", icons: ["credit-card", "landmark", "wallet", "hand-coins", "building-2"] },
  { key: "home", label: "Casa e contas", color: "#d4a03f", icons: ["house", "key", "wifi", "smartphone", "lightbulb", "zap", "droplet", "flame", "receipt"] },
  { key: "food", label: "Comida", color: "#e0843c", icons: ["cooking-pot", "utensils", "shopping-cart"] },
  { key: "health", label: "Saúde", color: "#2ba39a", icons: ["brain", "heart-pulse", "stethoscope", "pill", "dumbbell", "scissors", "sparkles"] },
  { key: "study", label: "Estudo", color: "#7b8cde", icons: ["graduation-cap", "languages", "book-open"] },
  { key: "fun", label: "Lazer", color: "#d16fa8", icons: ["music", "film", "tv", "gamepad-2", "party-popper", "repeat"] },
  { key: "transport", label: "Transporte", color: "#4fb3c8", icons: ["car", "fuel", "bus", "plane"] },
  { key: "shopping", label: "Compras", color: "#d16570", icons: ["shopping-bag", "shirt", "gift"] },
  { key: "other", label: "Outros", color: "#8a93a6", icons: ["baby", "paw-print", "shield-check", "wrench", "rotate-ccw", "plus-circle", "tag", "user-round", "circle-ellipsis"] },
];

/** Color of the theme an icon belongs to ("wifi" → amber, "pill" → teal). */
export function colorForIcon(name) {
  return (ICON_GROUPS.find((g) => g.icons.includes(name)) ?? ICON_GROUPS[ICON_GROUPS.length - 1]).color;
}

export function iconFor(name) {
  return ICONS[name] ?? Tag;
}

/** Colors offered everywhere (readable in both themes). */
export const SWATCHES = [
  "#3fae74", "#578cff", "#d4a03f", "#e0843c", "#2ba39a", "#7b8cde",
  "#d16fa8", "#4fb3c8", "#d16570", "#8a93a6", "#5b8fd1", "#c77d4f",
];

/** Suggests an icon from the name the user types ("Psicólogo" → brain). */
const HINTS = [
  [/sal[aá]rio|pagamento|holerite/i, "briefcase"],
  [/freela|projeto|site|servi[cç]o/i, "laptop"],
  [/fatura|cart[aã]o|nubank|ita[uú]|mercado ?livre|\binter\b|\bc6\b/i, "credit-card"],
  [/empr[eé]stimo|financiamento|parcela/i, "hand-coins"],
  [/aluguel|condom[ií]nio|casa|moradia/i, "house"],
  [/internet|wi-?fi|fibra/i, "wifi"],
  [/celular|telefone|plano|chip/i, "smartphone"],
  [/luz|energia|enel|cemig|light/i, "lightbulb"],
  [/[aá]gua|saneamento/i, "droplet"],
  [/g[aá]s/i, "flame"],
  [/comida|marmita|feij[aã]o|m[aã]e/i, "cooking-pot"],
  [/mercado|supermercado|feira/i, "shopping-cart"],
  [/restaurante|lanche|ifood|almo[cç]o/i, "utensils"],
  [/psic[oó]log|terapia/i, "brain"],
  [/m[eé]dico|consulta|plano de sa[uú]de|dentista/i, "stethoscope"],
  [/farm[aá]cia|rem[eé]dio/i, "pill"],
  [/academia|gym|crossfit|treino/i, "dumbbell"],
  [/cabelo|barbe|sal[aã]o/i, "scissors"],
  [/faculdade|curso|escola|mensalidade/i, "graduation-cap"],
  [/ingl[eê]s|espanhol|idioma|aula/i, "languages"],
  [/spotify|deezer|m[uú]sica/i, "music"],
  [/netflix|prime|disney|hbo|max|streaming|youtube/i, "tv"],
  [/jogo|game|xbox|playstation|steam/i, "gamepad-2"],
  [/uber|99|[oô]nibus|metr[oô]|transporte/i, "bus"],
  [/gasolina|combust[ií]vel|posto/i, "fuel"],
  [/carro|ipva|seguro auto/i, "car"],
  [/seguro/i, "shield-check"],
  [/pet|ra[cç][aã]o|veterin/i, "paw-print"],
  [/presente/i, "gift"],
];

export function suggestIcon(name) {
  return HINTS.find(([re]) => re.test(name))?.[1] ?? null;
}
