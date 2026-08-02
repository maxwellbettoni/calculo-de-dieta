/** Estimativa simples MET × peso × tempo (kcal). */
export type ExercisePreset = {
  name: string;
  met: number;
};

export const EXERCISE_PRESETS: ExercisePreset[] = [
  { name: "Caminhada leve", met: 3.5 },
  { name: "Caminhada rápida", met: 5 },
  { name: "Corrida leve", met: 8 },
  { name: "Musculação", met: 5 },
  { name: "Bicicleta", met: 6.5 },
  { name: "Natação", met: 7 },
  { name: "HIIT / funcional", met: 9 },
  { name: "Yoga", met: 3 },
];

export function estimateExerciseKcal(met: number, weightKg: number, minutes: number): number {
  // kcal ≈ MET × kg × horas
  return Math.round(met * weightKg * (minutes / 60));
}
