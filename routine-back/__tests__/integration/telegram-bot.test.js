import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import DayService from "../../src/services/DayService.js";
import RuleService from "../../src/services/RuleService.js";
import TelegramService from "../../src/services/telegram/TelegramService.js";
import { addDays, todayIn } from "../../src/utils/dateUtils.js";
import { createLoggedInUser, resetDatabase } from "./helpers.js";

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const today = todayIn();
const draftId = (reply) => reply.buttons[0][0].data.split(":")[1];

describe("telegram bot (7B and 7D, no Telegram calls)", () => {
  it("anotar: a draft that only becomes a task on Salvar; Cancelar drops it", async () => {
    const { user } = await createLoggedInUser();
    const reply = await TelegramService.answer(user, "anotar comprar pão amanhã de manhã", today);
    expect(reply.text).toContain("Comprar pão");
    expect(reply.buttons[0].map((b) => b.text)).toEqual(["Salvar", "Cancelar"]);
    expect(await prisma.dayItem.count({ where: { userId: user.id } })).toBe(0);

    const saved = await TelegramService.callback(user, `s:${draftId(reply)}`);
    expect(saved.text).toContain("Salvo");
    const item = await prisma.dayItem.findFirst({ where: { userId: user.id } });
    expect(item).toMatchObject({ name: "Comprar pão", kind: "TASK", period: "MORNING" });
    expect((await TelegramService.callback(user, `s:${draftId(reply)}`)).text).toContain("expirou"); // only once

    const inbox = await TelegramService.answer(user, "anotar renovar a CNH", today);
    expect(inbox.text).toContain("Quando der");
    expect((await TelegramService.callback(user, `c:${draftId(inbox)}`)).text).toBe("Cancelado.");
    expect(await prisma.dayItem.count({ where: { userId: user.id } })).toBe(1);
  });

  it("fiz: marks an item or an afazer of today, with Desfazer; several matches ask which", async () => {
    const { user } = await createLoggedInUser();
    await RuleService.create(user.id, { name: "Treino", weekdays: EVERY_DAY, startMinute: 360, endMinute: 420, startDate: today });
    await RuleService.create(user.id, { name: "Treino de inglês", weekdays: EVERY_DAY, startMinute: 1200, endMinute: 1260, startDate: today });
    await RuleService.create(user.id, { name: "Rotina diária", weekdays: EVERY_DAY, startDate: today, steps: [{ name: "Revisar flashcards" }, { name: "Ler 2 páginas" }] });

    const step = await TelegramService.answer(user, "fiz flashcards", today);
    expect(step.text).toContain("Revisar flashcards");
    const exact = await TelegramService.answer(user, "fiz treino", today);
    expect(exact.text).toContain("Feito");
    const day = await DayService.get(user.id, today);
    const treino = day.items.find((i) => i.name === "Treino");
    expect(treino.status).toBe("DONE");
    expect(day.anytime[0].steps.find((s) => s.name === "Revisar flashcards").doneAt).not.toBeNull();

    await TelegramService.callback(user, exact.buttons[0][0].data); // Desfazer
    expect((await DayService.get(user.id, today)).items.find((i) => i.name === "Treino").status).toBe("PENDING");

    const many = await TelegramService.answer(user, "fiz trein", today);
    expect(many.buttons.length).toBe(3); // two options + Cancelar
    await TelegramService.callback(user, many.buttons[1][0].data);
    expect((await DayService.get(user.id, today)).items.find((i) => i.name === "Treino de inglês").status).toBe("DONE");
    expect((await TelegramService.answer(user, "fiz natação", today)).text).toContain("Não achei");
  });

  it("imprevisto: the draft says what it takes; Salvar links them", async () => {
    const { user } = await createLoggedInUser();
    const date = addDays(today, 1);
    await RuleService.create(user.id, { name: "Estudo", weekdays: EVERY_DAY, startMinute: 900, endMinute: 960, startDate: today });
    const reply = await TelegramService.answer(user, `freelance ${date.slice(8)}/${date.slice(5, 7)} 14h às 21h`, today);
    expect(reply.text).toContain("Freelance");
    expect(reply.text).toContain("Estudo");
    await TelegramService.callback(user, `s:${draftId(reply)}`);
    const day = await DayService.get(user.id, date);
    expect(day.items.find((i) => i.name === "Estudo").displacedBy.name).toBe("Freelance");
    expect((await TelegramService.answer(user, "imprevisto cano estourado", today)).text).toContain("de que horas");
  });

  it("morning summary: from the Acordar time on, once a day, with what was left yesterday", async () => {
    const { user } = await createLoggedInUser({ name: "Ana Souza" });
    await RuleService.create(user.id, { name: "Acordar", weekdays: EVERY_DAY, startMinute: 405, endMinute: 420, startDate: addDays(today, -1) });
    await RuleService.create(user.id, { name: "Rotina de dormir", weekdays: EVERY_DAY, startMinute: 1380, endMinute: 1440, startDate: addDays(today, -1) });
    expect(await TelegramService.morningText(user, today, 400)).toBeNull();
    const text = await TelegramService.morningText(user, today, 410);
    expect(text).toContain("Bom dia, Ana");
    expect(text).toContain("Ontem ficou sem fazer");
    expect(text).toContain("Rotina de dormir");
  });
});
