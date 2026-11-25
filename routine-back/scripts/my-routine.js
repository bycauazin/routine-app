/**
 * Registers the owner's weekly routine (the spreadsheet "Rotina (1).pdf",
 * current version) for an existing user, through the same services as the
 * app. Weekends stay free; meals are not registered.
 * Lists ("Rotina diária", "Rotina do trabalho") have no time of their own and
 * show inside the blocks named in `inside` (a check there is the list's check).
 * "Rotina de dormir" starts without steps: the owner fills them in the app.
 *
 *   npm run routine:mine -- you@example.com                  # starts today
 *   npm run routine:mine -- you@example.com --from=2026-11-24
 *
 * Refuses to run when the user already has fixed items (no duplicates).
 */
import { prisma } from "../src/database/prisma.js";
import CategoryService from "../src/services/CategoryService.js";
import RuleService from "../src/services/RuleService.js";
import { isCivilDate, todayIn } from "../src/utils/dateUtils.js";

const WEEKDAYS = [1, 2, 3, 4, 5];
const MON_WED_FRI = [1, 3, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const h = (hour) => Math.round(hour * 60);

const DAILY_STEPS = ["Ler 2 páginas do livro", "Revisar flashcards", "Fazer 1 Duolingo", "Entrar no site da faculdade", "Anotar palavras em inglês que vi nas séries", "Exercícios P"];
const WORK_STEPS = ["Olhar e-mail", "Olhar OSTicket", "Olhar dash Power BI", "Olhar site desk", "Olhar Deskhub", "Anotar tarefas do dia"];

/**
 * [key, name, category, weekdays, start hour, end hour, { steps, inside, skipOnHolidays }]
 * Blocks come before the lists, so a list can name the blocks (by key) it shows inside.
 * No hours = no time of its own.
 */
export const MY_ROUTINE = [
  ["wake", "Acordar", "Pessoal", WEEKDAYS, 7, 8],
  ["commuteGo", "Condução", "Condução", MON_WED_FRI, 8, 9, { skipOnHolidays: true }],
  ["thainaTue", "Aula Thaina", "Aulas", [2], 8, 10],
  ["thainaThu", "Aula Thaina", "Aulas", [4], 8, 9],
  ["workMorning", "Trabalho", "Trabalho", [1, 3, 4, 5], 9, 12, { skipOnHolidays: true }],
  ["workMorningTue", "Trabalho", "Trabalho", [2], 10, 12, { skipOnHolidays: true }],
  ["lunch", "Almoço / estudo", "Refeição", WEEKDAYS, 12, 13],
  ["workAfternoon", "Trabalho", "Trabalho", WEEKDAYS, 13, 18, { skipOnHolidays: true }],
  ["commuteBack", "Condução", "Condução", MON_WED_FRI, 18, 19.5, { skipOnHolidays: true }],
  ["rafael", "Aula Rafael", "Aulas", [2, 3, 4], 20.5, 21.5],
  ["bedtime", "Rotina de dormir", "Pessoal", EVERY_DAY, 23, 24],
  ["daily", "Rotina diária", "Rotina diária", EVERY_DAY, null, null, { steps: DAILY_STEPS, inside: ["commuteGo", "commuteBack", "lunch"] }],
  ["work", "Rotina do trabalho", "Trabalho", WEEKDAYS, null, null, { steps: WORK_STEPS, inside: ["workMorning", "workMorningTue"] }],
];

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const from = process.argv.find((a) => a.startsWith("--from="))?.split("=")[1] ?? todayIn();
  if (!email || email.startsWith("--")) throw new Error("Uso: npm run routine:mine -- seu@email.com [--from=AAAA-MM-DD]");
  if (!isCivilDate(from)) throw new Error(`Data inválida: ${from}`);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error("Usuário não encontrado.");
  if ((await prisma.routineRule.count({ where: { userId: user.id } })) > 0) {
    throw new Error("Este usuário já tem itens fixos. Nada foi cadastrado (para não duplicar).");
  }

  const categories = await CategoryService.list(user.id);
  const categoryId = (name) => categories.find((c) => c.name === name)?.id ?? null;
  const ids = new Map();
  for (const [key, name, category, weekdays, start, end, { steps = [], inside = [], skipOnHolidays = false } = {}] of MY_ROUTINE) {
    const rule = await RuleService.create(user.id, {
      name,
      categoryId: categoryId(category),
      weekdays,
      startMinute: start === null ? null : h(start),
      endMinute: end === null ? null : h(end),
      startDate: from,
      skipOnHolidays,
      steps: steps.map((stepName) => ({ name: stepName })),
      insideRuleIds: inside.map((k) => ids.get(k)),
    });
    ids.set(key, rule.id);
  }
  console.log(`✔ ${MY_ROUTINE.length} itens fixos cadastrados a partir de ${from}.`);
}

main()
  .catch((error) => {
    console.error(`✖ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
