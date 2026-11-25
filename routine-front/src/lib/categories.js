/**
 * Kinds of routine block and their tint (tokens --cat-* in index.css). The
 * tints sit outside the 60-30-10 rule and always carry --ink text.
 * Full class names on purpose: Tailwind only generates classes it can read.
 */
export const CATEGORY_TINT = {
  work: "bg-cat-work",
  commute: "bg-cat-commute",
  study: "bg-cat-study",
  meal: "bg-cat-meal",
  workout: "bg-cat-workout",
  class: "bg-cat-class",
  personal: "bg-cat-personal",
  daily: "bg-cat-daily",
};

export const CATEGORY_LABEL = {
  work: "Trabalho",
  commute: "Condução",
  study: "Estudo",
  class: "Aulas",
  workout: "Treino",
  meal: "Refeição",
  personal: "Pessoal",
  daily: "Rotina diária",
};
