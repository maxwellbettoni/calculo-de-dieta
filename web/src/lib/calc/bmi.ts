export type BmiClass =
  | "baixo_peso"
  | "eutrofia"
  | "sobrepeso"
  | "obesidade_1"
  | "obesidade_2"
  | "obesidade_3";

export type BmiResult = {
  bmi: number;
  classId: BmiClass;
  label: string;
};

/** IMC = peso(kg) / altura(m)² — classificação OMS adultos. */
export function calcBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  if (!Number.isFinite(bmi)) return null;

  let classId: BmiClass;
  let label: string;
  if (bmi < 18.5) {
    classId = "baixo_peso";
    label = "Baixo peso";
  } else if (bmi < 25) {
    classId = "eutrofia";
    label = "Eutrofia";
  } else if (bmi < 30) {
    classId = "sobrepeso";
    label = "Sobrepeso";
  } else if (bmi < 35) {
    classId = "obesidade_1";
    label = "Obesidade grau I";
  } else if (bmi < 40) {
    classId = "obesidade_2";
    label = "Obesidade grau II";
  } else {
    classId = "obesidade_3";
    label = "Obesidade grau III";
  }

  return { bmi: round1(bmi), classId, label };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
