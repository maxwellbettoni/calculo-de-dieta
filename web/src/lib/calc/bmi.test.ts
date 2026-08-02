import { describe, expect, it } from "vitest";
import { calcBmi } from "./bmi";

describe("calcBmi", () => {
  it("classifica eutrofia", () => {
    const r = calcBmi(70, 175);
    expect(r).not.toBeNull();
    expect(r!.bmi).toBe(22.9);
    expect(r!.classId).toBe("eutrofia");
  });

  it("classifica obesidade I", () => {
    const r = calcBmi(95, 170);
    expect(r!.classId).toBe("obesidade_1");
  });

  it("rejeita valores inválidos", () => {
    expect(calcBmi(0, 170)).toBeNull();
    expect(calcBmi(70, 0)).toBeNull();
  });
});
