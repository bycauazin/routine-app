import { describe, expect, it } from "vitest";
import { liters } from "./water";

describe("liters", () => {
  it("shows ml under 1 L and liters with a comma from there", () => {
    expect(liters(800)).toBe("800 ml");
    expect(liters(1200)).toBe("1,2 L");
    expect(liters(2000)).toBe("2 L");
  });
});
