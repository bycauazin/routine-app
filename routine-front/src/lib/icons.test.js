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
    expect(colorForIcon("wifi")).toBe(ICON_GROUPS.find((g) => g.key === "home").color);
    expect(colorForIcon("pill")).toBe(ICON_GROUPS.find((g) => g.key === "health").color);
    expect(colorForIcon("unknown")).toBe(ICON_GROUPS.find((g) => g.key === "other").color);
  });

  it("suggests icons from the name", () => {
    expect(suggestIcon("Internet")).toBe("wifi");
    expect(suggestIcon("Cartão Inter")).toBe("credit-card");
    expect(suggestIcon("Psicólogo")).toBe("brain");
    expect(suggestIcon("Coisa qualquer")).toBe(null);
  });
});
