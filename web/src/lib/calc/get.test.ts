import { describe, expect, it } from "vitest";
import { calcGet, calcTmb, calcWaterMl, tmbMifflin } from "./get";
import { macrosFromKcal, macroPreset } from "./macros";

describe("GET", () => {
  it("Mifflin masculino coerente", () => {
    const tmb = tmbMifflin(80, 175, 30, "masculino");
    expect(tmb).toBeCloseTo(1748.75, 1);
    expect(calcTmb("mifflin", 80, 175, 30, "masculino")).toBe(1749);
  });

  it("GET = TMB × AF", () => {
    expect(calcGet(1700, "moderado")).toBe(2635);
  });

  it("água 35 ml/kg", () => {
    expect(calcWaterMl(80, 35)).toBe(2800);
  });
});

describe("macros", () => {
  it("soma 100 e gramas", () => {
    const m = macrosFromKcal(2000, 50, 25, 25);
    expect(m.ok).toBe(true);
    expect(m.carbG).toBe(250);
    expect(m.proteinG).toBe(125);
    expect(m.fatG).toBe(56);
  });

  it("preset hipertrofia", () => {
    const p = macroPreset("hipertrofia");
    expect(p.carbPct + p.proteinPct + p.fatPct).toBe(100);
  });
});
