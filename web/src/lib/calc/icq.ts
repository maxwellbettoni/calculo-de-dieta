export type IcqRisk = "baixo" | "aumentado" | "alto";

export type IcqResult = {
  icq: number;
  risk: IcqRisk;
  label: string;
};

/**
 * ICQ = cintura / quadril.
 * Limiares clínicos usuais por sexo biológico.
 */
export function calcIcq(
  waistCm: number,
  hipCm: number,
  gender: "feminino" | "masculino" | "outro" | ""
): IcqResult | null {
  if (!Number.isFinite(waistCm) || !Number.isFinite(hipCm)) return null;
  if (waistCm <= 0 || hipCm <= 0) return null;
  const icq = waistCm / hipCm;
  if (!Number.isFinite(icq)) return null;

  const sex = gender === "feminino" || gender === "masculino" ? gender : "outro";
  let risk: IcqRisk;
  let label: string;

  if (sex === "masculino") {
    if (icq < 0.9) {
      risk = "baixo";
      label = "Risco baixo";
    } else if (icq < 1.0) {
      risk = "aumentado";
      label = "Risco aumentado";
    } else {
      risk = "alto";
      label = "Risco alto";
    }
  } else if (sex === "feminino") {
    if (icq < 0.8) {
      risk = "baixo";
      label = "Risco baixo";
    } else if (icq < 0.85) {
      risk = "aumentado";
      label = "Risco aumentado";
    } else {
      risk = "alto";
      label = "Risco alto";
    }
  } else {
    // Sem sexo: só valor; risco genérico por 0,90
    if (icq < 0.9) {
      risk = "baixo";
      label = "Risco baixo (limiar genérico)";
    } else if (icq < 1.0) {
      risk = "aumentado";
      label = "Risco aumentado (limiar genérico)";
    } else {
      risk = "alto";
      label = "Risco alto (limiar genérico)";
    }
  }

  return { icq: Math.round(icq * 1000) / 1000, risk, label };
}
