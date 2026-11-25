import { randomUUID } from "node:crypto";
import { prisma } from "../database/prisma.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { todayIn } from "../utils/dateUtils.js";
import { normalizeWeekdays, timeError } from "../utils/routineUtils.js";
import CategoryService from "./CategoryService.js";
import RuleService from "./RuleService.js";

/**
 * Simulações: draft weekly routines to play with (move blocks, swap days, add
 * a gym slot) without touching the real routine, the days or the reports.
 * A simulation is a list of blocks (the same fields as a fixed item, without
 * dates). It can start as a copy of the current routine, of another
 * simulation, or empty, and can be applied as the real routine from a date.
 *
 * Block: { key, name, categoryId, icon, weekdays, startMinute, endMinute,
 * period, steps: [{ name, minute }], insideKeys: [block keys this list shows in] }.
 */
const MAX_BLOCKS = 120;

class SimulationService {
  dto(s) {
    return { id: s.id, name: s.name, blocks: s.blocks ?? [], createdAt: s.createdAt, updatedAt: s.updatedAt };
  }

  /** The current fixed routine as simulation blocks (rule ids become block keys). */
  async currentBlocks(userId) {
    const rules = await RuleService.list(userId);
    return rules.map((r) => ({
      key: r.id,
      name: r.name,
      categoryId: r.categoryId,
      icon: r.icon,
      weekdays: r.weekdays,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      period: r.period,
      steps: (r.steps ?? []).map(({ name, minute }) => ({ name, minute: minute ?? null })),
      insideKeys: r.insideRuleIds ?? [],
    }));
  }

  /** Fresh keys for every block (and its list links), so copies never share keys. */
  rekey(blocks) {
    const map = new Map(blocks.map((b) => [b.key, randomUUID()]));
    return blocks.map((b) => ({ ...b, key: map.get(b.key), insideKeys: (b.insideKeys ?? []).map((k) => map.get(k)).filter(Boolean) }));
  }

  /** Checks every block like a fixed item (name, weekdays, times, own category); drops broken list links. */
  async clean(userId, blocks) {
    if (blocks.length > MAX_BLOCKS) throw new ValidationError(`Use no máximo ${MAX_BLOCKS} blocos.`, { blocks: `Use no máximo ${MAX_BLOCKS} blocos.` });
    const categories = new Set((await CategoryService.list(userId, { includeArchived: true })).map((c) => c.id));
    const keys = new Set(blocks.map((b) => b.key));
    return blocks.map((b) => {
      const weekdays = normalizeWeekdays(b.weekdays);
      const name = b.name.trim();
      const period = b.period ?? null;
      const startMinute = period ? null : (b.startMinute ?? null);
      const endMinute = period ? null : (b.endMinute ?? null);
      const fail = !name ? "Informe o nome." : weekdays.length === 0 ? "Escolha pelo menos um dia da semana." : timeError(startMinute, endMinute, period);
      if (fail) throw new ValidationError(`${name || "Bloco"}: ${fail}`, { blocks: `${name || "Bloco"}: ${fail}` });
      return {
        key: b.key,
        name,
        categoryId: b.categoryId && categories.has(b.categoryId) ? b.categoryId : null,
        icon: b.icon ?? null,
        weekdays,
        startMinute,
        endMinute,
        period,
        steps: (b.steps ?? []).filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), minute: s.minute ?? null })),
        insideKeys: [...new Set((b.insideKeys ?? []).filter((k) => k !== b.key && keys.has(k)))],
      };
    });
  }

  async findOrThrow(userId, id) {
    const s = await prisma.simulation.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundError("Simulação não encontrada.");
    return s;
  }

  async list(userId) {
    const rows = await prisma.simulation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
    return rows.map((s) => this.dto(s));
  }

  async get(userId, id) {
    return this.dto(await this.findOrThrow(userId, id));
  }

  /** `from`: "current" (copy of the real routine), "empty", or another simulation's id. */
  async create(userId, { name, from = "current" }) {
    let blocks = [];
    if (from === "current") blocks = this.rekey(await this.currentBlocks(userId));
    else if (from !== "empty") blocks = this.rekey((await this.findOrThrow(userId, from)).blocks ?? []);
    const s = await prisma.simulation.create({ data: { userId, name: name.trim(), blocks } });
    return this.dto(s);
  }

  async update(userId, id, { name, blocks }) {
    await this.findOrThrow(userId, id);
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (blocks !== undefined) data.blocks = await this.clean(userId, blocks);
    return this.dto(await prisma.simulation.update({ where: { id }, data }));
  }

  async remove(userId, id) {
    await this.findOrThrow(userId, id);
    await prisma.simulation.delete({ where: { id } });
  }

  /**
   * "Usar esta rotina a partir de…": every fixed item leaves the routine from
   * `from` on (the past stays), and the simulation's blocks become the fixed
   * items from that day. Lists are created last, pointing at the new blocks.
   */
  async apply(userId, id, { from }) {
    const start = from ?? todayIn();
    if (start < todayIn()) throw new ValidationError("Escolha hoje ou um dia futuro.", { from: "Escolha hoje ou um dia futuro." });
    const blocks = await this.clean(userId, (await this.findOrThrow(userId, id)).blocks ?? []);
    for (const rule of await RuleService.list(userId)) await RuleService.remove(userId, rule.id, { from: start });
    const ids = new Map();
    const ordered = [...blocks.filter((b) => !b.insideKeys.length), ...blocks.filter((b) => b.insideKeys.length)];
    for (const b of ordered) {
      const rule = await RuleService.create(userId, {
        name: b.name,
        categoryId: b.categoryId,
        icon: b.icon,
        weekdays: b.weekdays,
        startMinute: b.startMinute,
        endMinute: b.endMinute,
        period: b.period,
        steps: b.steps,
        insideRuleIds: b.insideKeys.map((k) => ids.get(k)).filter(Boolean),
        startDate: start,
      });
      ids.set(b.key, rule.id);
    }
    return { applied: blocks.length, from: start };
  }
}

export default new SimulationService();
