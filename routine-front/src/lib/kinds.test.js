import { describe, expect, it } from "vitest";
import { itemKindLabel } from "./kinds";

describe("item kind labels", () => {
  it("says fixa/avulsa (fixo/avulso) where it helps", () => {
    expect(itemKindLabel({ kind: "TASK", ruleId: "r1" })).toBe("Tarefa fixa");
    expect(itemKindLabel({ kind: "TASK", ruleId: null })).toBe("Tarefa avulsa");
    expect(itemKindLabel({ kind: "APPOINTMENT", ruleId: "r1" })).toBe("Compromisso fixo");
    expect(itemKindLabel({ kind: "APPOINTMENT", ruleId: null })).toBe("Compromisso avulso");
  });

  it("calls every fixed item a block", () => {
    expect(itemKindLabel({ kind: "ROUTINE", ruleId: "r1" })).toBe("Bloco fixo");
  });
});
