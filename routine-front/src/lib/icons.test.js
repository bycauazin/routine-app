import { describe, expect, it } from "vitest";
import { ICONS, ICON_GROUPS, colorForIcon, suggestIcon } from "./icons";

describe("icon themes", () => {
  it("every icon belongs to exactly one theme", () => {
    const grouped = ICON_GROUPS.flatMap((g) => g.icons);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(Object.keys(ICONS).sort());
  });

  it("each theme has its own color and icons take it", () => {
    const colors = ICON_GROUPS.map((g) => g.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colorForIcon("moon")).toBe(ICON_GROUPS.find((g) => g.key === "routine").color);
    expect(colorForIcon("pill")).toBe(ICON_GROUPS.find((g) => g.key === "health").color);
    expect(colorForIcon("unknown")).toBe(ICON_GROUPS.find((g) => g.key === "other").color);
  });

  it("suggests icons from the name", () => {
    expect(suggestIcon("Rotina de dormir")).toBe("moon");
    expect(suggestIcon("Muay Thai")).toBe("dumbbell");
    expect(suggestIcon("Condução")).toBe("bus");
    expect(suggestIcon("Ler 2 páginas de um livro")).toBe("book-open");
    expect(suggestIcon("Consertar bica da minha mãe")).toBe("wrench");
    expect(suggestIcon("Limpar varanda")).toBe("spray-can");
    expect(suggestIcon("Rotina diária")).toBe("repeat");
    expect(suggestIcon("Coisa qualquer")).toBe(null);
  });
});
