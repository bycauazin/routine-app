import {
  AlarmClock,
  Apple,
  Baby,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Bus,
  Calendar,
  Car,
  CircleEllipsis,
  Coffee,
  CookingPot,
  CreditCard,
  Droplet,
  Dumbbell,
  Film,
  Footprints,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  House,
  Languages,
  Laptop,
  ListTodo,
  Mail,
  MapPin,
  Moon,
  Music,
  NotebookPen,
  PartyPopper,
  PawPrint,
  Phone,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  ShowerHead,
  Sparkles,
  SprayCan,
  Stethoscope,
  Sun,
  Tag,
  Tv,
  UserRound,
  Users,
  Utensils,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * Whitelist of icons for categories and items of the routine. The API stores
 * the kebab-case name; unknown names fall back to a tag.
 */
export const ICONS = {
  // rotina e casa
  "alarm-clock": AlarmClock,
  sun: Sun,
  moon: Moon,
  bed: Bed,
  "shower-head": ShowerHead,
  coffee: Coffee,
  house: House,
  "spray-can": SprayCan,
  wrench: Wrench,
  shirt: Shirt,
  repeat: Repeat,
  sparkles: Sparkles,
  // trabalho e estudo
  briefcase: Briefcase,
  laptop: Laptop,
  users: Users,
  phone: Phone,
  mail: Mail,
  "notebook-pen": NotebookPen,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  languages: Languages,
  brain: Brain,
  // saúde e treino
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  pill: Pill,
  droplet: Droplet,
  apple: Apple,
  utensils: Utensils,
  "cooking-pot": CookingPot,
  // deslocamento
  bus: Bus,
  car: Car,
  plane: Plane,
  "map-pin": MapPin,
  // lazer e pessoas
  music: Music,
  film: Film,
  tv: Tv,
  "gamepad-2": Gamepad2,
  gift: Gift,
  "party-popper": PartyPopper,
  heart: Heart,
  baby: Baby,
  "paw-print": PawPrint,
  "user-round": UserRound,
  // compras e contas
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  "credit-card": CreditCard,
  wallet: Wallet,
  receipt: Receipt,
  // outros
  calendar: Calendar,
  "list-todo": ListTodo,
  tag: Tag,
  "circle-ellipsis": CircleEllipsis,
};

/**
 * The same icons by theme, so the picker shows a few at a time. Each theme
 * has a color, used for an item without a category.
 */
export const ICON_GROUPS = [
  { key: "routine", label: "Rotina e casa", color: "#d4a03f", icons: ["alarm-clock", "sun", "moon", "bed", "shower-head", "coffee", "house", "spray-can", "wrench", "shirt", "repeat", "sparkles"] },
  { key: "work", label: "Trabalho e estudo", color: "#7b8cde", icons: ["briefcase", "laptop", "users", "phone", "mail", "notebook-pen", "book-open", "graduation-cap", "languages", "brain"] },
  { key: "health", label: "Saúde e treino", color: "#2ba39a", icons: ["dumbbell", "footprints", "bike", "heart-pulse", "stethoscope", "pill", "droplet", "apple", "utensils", "cooking-pot"] },
  { key: "transport", label: "Deslocamento", color: "#4fb3c8", icons: ["bus", "car", "plane", "map-pin"] },
  { key: "fun", label: "Lazer e pessoas", color: "#d16fa8", icons: ["music", "film", "tv", "gamepad-2", "gift", "party-popper", "heart", "baby", "paw-print", "user-round"] },
  { key: "shopping", label: "Compras e contas", color: "#d16570", icons: ["shopping-cart", "shopping-bag", "credit-card", "wallet", "receipt"] },
  { key: "other", label: "Outros", color: "#8a93a6", icons: ["calendar", "list-todo", "tag", "circle-ellipsis"] },
];

/** Color of the theme an icon belongs to ("moon" → amber, "pill" → teal). */
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

/** Suggests an icon from the name the user types ("Muay Thai" → dumbbell). First match wins. */
const HINTS = [
  [/dormir|sono|deitar/i, "moon"],
  [/acordar|despertar/i, "alarm-clock"],
  [/banho/i, "shower-head"],
  [/presente|anivers/i, "gift"],
  [/condu[cç][aã]o|[oô]nibus|metr[oô]|trem|uber|trajeto/i, "bus"],
  [/carro|dirigir|gasolina/i, "car"],
  [/viagem|voo|aeroporto/i, "plane"],
  [/reuni[aã]o|\bcall\b|cliente/i, "users"],
  [/trabalh|expediente|escrit[oó]rio|servi[cç]o/i, "briefcase"],
  [/almo[cç]o|jantar|refei[cç][aã]o|lanche/i, "utensils"],
  [/caf[eé]/i, "coffee"],
  [/cozinhar|marmita|receita/i, "cooking-pot"],
  [/ingl[eê]s|espanhol|idioma|duolingo|li[cç][aã]o/i, "languages"],
  [/flashcard|revis|anki|medita/i, "brain"],
  [/\bler\b|livro|leitura|p[aá]gina/i, "book-open"],
  [/aula|estud|faculdade|curso|prova|escola/i, "graduation-cap"],
  [/treino|academia|muay|thai|jiu|luta|crossfit|yoga|muscula|funcional/i, "dumbbell"],
  [/corr(ida|er)|caminhada|caminhar/i, "footprints"],
  [/bike|bicicleta|pedal/i, "bike"],
  [/[aá]gua/i, "droplet"],
  [/rem[eé]dio|vitamina|suplemento|creatina/i, "pill"],
  [/m[eé]dico|dentista|consulta|exame|psic[oó]log|terapia/i, "stethoscope"],
  [/limp|faxina|varanda|varrer|arrumar|lou[cç]a/i, "spray-can"],
  [/consert|bica|torneira|reparo|instalar|montar/i, "wrench"],
  [/roupa|lavanderia|passar/i, "shirt"],
  [/mercado|feira|compras/i, "shopping-cart"],
  [/pagar|conta\b|boleto|fatura/i, "receipt"],
  [/ligar|telefon|liga[cç][aã]o/i, "phone"],
  [/e-?mail/i, "mail"],
  [/rotina/i, "repeat"],
  [/filme|cinema/i, "film"],
  [/s[eé]rie|netflix/i, "tv"],
  [/jogo|game|videogame/i, "gamepad-2"],
  [/m[uú]sica|viol[aã]o|guitarra|piano/i, "music"],
  [/cachorro|gato|pet|ra[cç][aã]o/i, "paw-print"],
  [/m[aã]e|\bpai\b|fam[ií]lia|namor|av[oó]/i, "heart"],
  [/escrever|anotar|di[aá]rio/i, "notebook-pen"],
  [/notebook|computador|c[oó]digo|programa/i, "laptop"],
];

export function suggestIcon(name) {
  return HINTS.find(([re]) => re.test(name ?? ""))?.[1] ?? null;
}

/** Icon of each kind when nothing else fits. */
const KIND_ICON = { ROUTINE: "repeat", TASK: "list-todo", APPOINTMENT: "calendar", WORKOUT: "dumbbell", HABIT: "sparkles", CLASS: "graduation-cap" };

/** The icon an item shows: the one chosen, else suggested by its name, else its category's, else its kind's. */
export function itemIcon(item) {
  return item.icon ?? suggestIcon(item.name) ?? item.category?.icon ?? KIND_ICON[item.kind] ?? "tag";
}
