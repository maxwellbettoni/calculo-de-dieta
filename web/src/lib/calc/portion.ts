export type Nutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
};

/** Escala nutrientes de per-100g para `grams`. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10,
    fiber: Math.round(per100.fiber * f * 10) / 10,
    sodium: Math.round(per100.sodium * f),
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: Math.round((acc.protein + n.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
      fat: Math.round((acc.fat + n.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + n.fiber) * 10) / 10,
      sodium: acc.sodium + n.sodium,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
  );
}
