export type SexBinary = "feminino" | "masculino";

export type GetEquation = "harris" | "mifflin" | "fao";

export type ActivityLevel =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito_ativo";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentario: "Sedentário (1,2)",
  leve: "Levemente ativo (1,375)",
  moderado: "Moderado (1,55)",
  ativo: "Ativo (1,725)",
  muito_ativo: "Muito ativo (1,9)",
};

function round0(n: number): number {
  return Math.round(n);
}

/** Harris-Benedict (clássica). */
export function tmbHarris(weightKg: number, heightCm: number, age: number, sex: SexBinary): number {
  if (sex === "masculino") {
    return 66.5 + 13.75 * weightKg + 5.003 * heightCm - 6.75 * age;
  }
  return 655.1 + 9.563 * weightKg + 1.85 * heightCm - 4.676 * age;
}

/** Mifflin-St Jeor. */
export function tmbMifflin(weightKg: number, heightCm: number, age: number, sex: SexBinary): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "masculino" ? base + 5 : base - 161;
}

/**
 * FAO/OMS (Schofield) por faixa etária — TMB em kcal/dia.
 */
export function tmbFao(weightKg: number, age: number, sex: SexBinary): number {
  if (sex === "masculino") {
    if (age < 3) return 60.9 * weightKg - 54;
    if (age < 10) return 22.7 * weightKg + 495;
    if (age < 18) return 17.5 * weightKg + 651;
    if (age < 30) return 15.3 * weightKg + 679;
    if (age < 60) return 11.6 * weightKg + 879;
    return 13.5 * weightKg + 487;
  }
  if (age < 3) return 61.0 * weightKg - 51;
  if (age < 10) return 22.5 * weightKg + 499;
  if (age < 18) return 12.2 * weightKg + 746;
  if (age < 30) return 14.7 * weightKg + 496;
  if (age < 60) return 8.7 * weightKg + 829;
  return 10.5 * weightKg + 596;
}

export function calcTmb(
  equation: GetEquation,
  weightKg: number,
  heightCm: number,
  age: number,
  sex: SexBinary
): number {
  let tmb: number;
  if (equation === "harris") tmb = tmbHarris(weightKg, heightCm, age, sex);
  else if (equation === "mifflin") tmb = tmbMifflin(weightKg, heightCm, age, sex);
  else tmb = tmbFao(weightKg, age, sex);
  return round0(tmb);
}

export function calcGet(tmb: number, activity: ActivityLevel): number {
  return round0(tmb * ACTIVITY_FACTORS[activity]);
}

export function calcWaterMl(weightKg: number, mlPerKg = 35): number {
  return round0(weightKg * mlPerKg);
}
