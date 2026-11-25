import { describe, expect, it } from "vitest";
import { weekdaysLabel } from "./weekdays";

describe("weekdaysLabel", () => {
  it.each([
    [[1, 2, 3, 4, 5], "seg a sex"],
    [[0, 1, 2, 3, 4, 5, 6], "todo dia"],
    [[6, 0], "fim de semana"],
    [[1, 3, 5], "seg, qua e sex"],
    [[2, 4], "ter e qui"],
    [[6], "sáb"],
    [[3, 4, 5, 6, 0], "qua a dom"],
    [[], ""],
  ])("%j → %s", (days, label) => {
    expect(weekdaysLabel(days)).toBe(label);
  });
});
