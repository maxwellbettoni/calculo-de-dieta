import { describe, expect, it } from "vitest";
import { calcIcq } from "./icq";

describe("calcIcq", () => {
  it("risco baixo masculino", () => {
    const r = calcIcq(80, 100, "masculino");
    expect(r!.icq).toBe(0.8);
    expect(r!.risk).toBe("baixo");
  });

  it("risco alto feminino", () => {
    const r = calcIcq(90, 100, "feminino");
    expect(r!.risk).toBe("alto");
  });
});
