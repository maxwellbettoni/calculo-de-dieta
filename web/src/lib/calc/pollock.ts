import { round1, round2 } from "./bmi";

export type SexBinary = "feminino" | "masculino";

export type SkinfoldsMm = {
  tricipital?: number;
  subescapular?: number;
  suprailiaca?: number;
  abdominal?: number;
  peitoral?: number;
  axilarMedia?: number;
  coxa?: number;
};

export type BodyCompResult = {
  protocol: "pollock7" | "pollock3";
  sumMm: number;
  bodyDensity: number;
  bodyFatPct: number;
  fatMassKg: number;
  leanMassKg: number;
};

/** Equação de Siri: %BF a partir da densidade corporal. */
export function siriBodyFatPct(bodyDensity: number): number {
  return ((4.95 / bodyDensity) - 4.5) * 100;
}

function finitePositive(n: number | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

/**
 * Jackson & Pollock 7 dobras.
 * Homem: peitoral, axilar média, tríceps, subescapular, abdômen, suprailiíaca, coxa.
 * Mulher: mesmas 7.
 */
export function calcPollock7(
  folds: SkinfoldsMm,
  ageYears: number,
  sex: SexBinary,
  weightKg: number
): BodyCompResult | null {
  if (!Number.isFinite(ageYears) || ageYears <= 0 || weightKg <= 0) return null;
  const keys: (keyof SkinfoldsMm)[] = [
    "peitoral",
    "axilarMedia",
    "tricipital",
    "subescapular",
    "abdominal",
    "suprailiaca",
    "coxa",
  ];
  const values = keys.map((k) => folds[k]);
  if (!values.every(finitePositive)) return null;
  const sum = values.reduce((a, b) => a + b, 0);

  let bd: number;
  if (sex === "masculino") {
    bd =
      1.112 -
      0.00043499 * sum +
      0.00000055 * sum * sum -
      0.00028826 * ageYears;
  } else {
    bd =
      1.097 -
      0.00046971 * sum +
      0.00000056 * sum * sum -
      0.00012828 * ageYears;
  }

  return compose(bd, sum, weightKg, "pollock7");
}

/**
 * Jackson & Pollock 3 dobras.
 * Homem: peitoral, abdômen, coxa.
 * Mulher: tríceps, suprailiíaca, coxa.
 */
export function calcPollock3(
  folds: SkinfoldsMm,
  ageYears: number,
  sex: SexBinary,
  weightKg: number
): BodyCompResult | null {
  if (!Number.isFinite(ageYears) || ageYears <= 0 || weightKg <= 0) return null;

  let sum: number;
  let bd: number;

  if (sex === "masculino") {
    if (
      !finitePositive(folds.peitoral) ||
      !finitePositive(folds.abdominal) ||
      !finitePositive(folds.coxa)
    ) {
      return null;
    }
    sum = folds.peitoral + folds.abdominal + folds.coxa;
    bd =
      1.10938 -
      0.0008267 * sum +
      0.0000016 * sum * sum -
      0.0002574 * ageYears;
  } else {
    if (
      !finitePositive(folds.tricipital) ||
      !finitePositive(folds.suprailiaca) ||
      !finitePositive(folds.coxa)
    ) {
      return null;
    }
    sum = folds.tricipital + folds.suprailiaca + folds.coxa;
    bd =
      1.0994921 -
      0.0009929 * sum +
      0.0000023 * sum * sum -
      0.0001392 * ageYears;
  }

  return compose(bd, sum, weightKg, "pollock3");
}

function compose(
  bd: number,
  sum: number,
  weightKg: number,
  protocol: "pollock7" | "pollock3"
): BodyCompResult | null {
  if (!Number.isFinite(bd) || bd <= 0) return null;
  const pct = siriBodyFatPct(bd);
  if (!Number.isFinite(pct) || pct < 0 || pct > 70) return null;
  const fatMassKg = weightKg * (pct / 100);
  const leanMassKg = weightKg - fatMassKg;
  return {
    protocol,
    sumMm: round1(sum),
    bodyDensity: round2(bd),
    bodyFatPct: round1(pct),
    fatMassKg: round1(fatMassKg),
    leanMassKg: round1(leanMassKg),
  };
}
