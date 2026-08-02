import { describe, expect, it } from "vitest";
import { calcPollock3, calcPollock7, siriBodyFatPct } from "./pollock";

describe("pollock", () => {
  it("Siri coerente", () => {
    expect(siriBodyFatPct(1.07)).toBeCloseTo(12.6, 0);
  });

  it("Pollock 7 masculino retorna composição", () => {
    const r = calcPollock7(
      {
        peitoral: 10,
        axilarMedia: 12,
        tricipital: 12,
        subescapular: 14,
        abdominal: 20,
        suprailiaca: 15,
        coxa: 18,
      },
      30,
      "masculino",
      80
    );
    expect(r).not.toBeNull();
    expect(r!.protocol).toBe("pollock7");
    expect(r!.bodyFatPct).toBeGreaterThan(5);
    expect(r!.bodyFatPct).toBeLessThan(40);
    expect(r!.fatMassKg + r!.leanMassKg).toBeCloseTo(80, 0);
  });

  it("Pollock 3 feminino usa tríceps/supra/coxa", () => {
    const r = calcPollock3(
      { tricipital: 18, suprailiaca: 20, coxa: 25 },
      28,
      "feminino",
      65
    );
    expect(r).not.toBeNull();
    expect(r!.sumMm).toBe(63);
  });

  it("falha sem dobras obrigatórias", () => {
    expect(calcPollock3({ peitoral: 10 }, 30, "masculino", 80)).toBeNull();
  });
});
