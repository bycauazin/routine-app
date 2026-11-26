import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/database/prisma.js";
import { interpret } from "../../src/services/telegram/ai.js";
import TelegramService from "../../src/services/telegram/TelegramService.js";
import { TELEGRAM_AI_PER_HOUR } from "../../src/shared/constants.js";
import { todayIn } from "../../src/utils/dateUtils.js";
import { createLoggedInUser, resetDatabase } from "./helpers.js";

// AI "on" without a real provider: it never understands, so the reply stays "não entendi".
vi.mock("../../src/services/telegram/ai.js", () => ({ aiEnabled: () => true, interpret: vi.fn(async () => null) }));

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(interpret).mockClear();
});
afterAll(() => prisma.$disconnect());

describe("telegram bot · AI limit per person", () => {
  it("asks the AI at most TELEGRAM_AI_PER_HOUR times an hour, then answers without it", async () => {
    const { user } = await createLoggedInUser();
    for (let i = 0; i <= TELEGRAM_AI_PER_HOUR; i += 1) await TelegramService.answer(user, `blá blá ${i}`, todayIn());
    expect(interpret).toHaveBeenCalledTimes(TELEGRAM_AI_PER_HOUR);

    // The count is per person: someone else still gets the AI.
    const { user: other } = await createLoggedInUser({ email: "outra@example.com" });
    await TelegramService.answer(other, "blá blá", todayIn());
    expect(interpret).toHaveBeenCalledTimes(TELEGRAM_AI_PER_HOUR + 1);
  });
});
