import {
  cloneMeals,
  createMealDayFromPlan,
  db,
  defaultMeals,
  distributeMealKcalLimits,
  ensureFoodsSeeded,
  getMealDayByDate,
  mealKcalWeight,
  saveMealDay,
  uid,
  type DietPlan,
  type Food,
  type Meal,
  type MealDay,
  type MealItem,
} from "./db";

type SlotFood = { nameIncludes: string[]; grams: number };

/** Sugestão típica BR por tipo de refeição (nomes batem com a tabela). */
const SLOT_TEMPLATES: { match: RegExp; foods: SlotFood[] }[] = [
  {
    match: /café|manhã|breakfast/i,
    foods: [
      { nameIncludes: ["Aveia em flocos"], grams: 40 },
      { nameIncludes: ["Banana prata", "Banana nanica"], grams: 100 },
      { nameIncludes: ["Ovo de galinha inteiro cozido", "Ovo mexido"], grams: 100 },
      { nameIncludes: ["Leite desnatado", "Leite semidesnatado"], grams: 200 },
    ],
  },
  {
    match: /lanche da manhã|colação/i,
    foods: [
      { nameIncludes: ["Iogurte grego natural", "Iogurte natural desnatado"], grams: 150 },
      { nameIncludes: ["Maçã com casca", "Mamão papaia"], grams: 120 },
    ],
  },
  {
    match: /almoço/i,
    foods: [
      { nameIncludes: ["Arroz branco cozido", "Arroz integral cozido"], grams: 150 },
      { nameIncludes: ["Feijão carioca cozido", "Feijão preto cozido"], grams: 100 },
      { nameIncludes: ["Peito de frango grelhado", "Carne bovina magra grelhada"], grams: 120 },
      { nameIncludes: ["Alface crespa", "Tomate", "Brócolis cozido"], grams: 80 },
      { nameIncludes: ["Azeite de oliva"], grams: 5 },
    ],
  },
  {
    match: /lanche da tarde|lanche/i,
    foods: [
      { nameIncludes: ["Banana prata", "Maçã com casca"], grams: 100 },
      { nameIncludes: ["Whey protein concentrado", "Queijo cottage"], grams: 30 },
      { nameIncludes: ["Amendoim torrado", "Castanha de caju"], grams: 15 },
    ],
  },
  {
    match: /jantar|ceia/i,
    foods: [
      { nameIncludes: ["Batata-doce cozida", "Batata inglesa cozida"], grams: 150 },
      { nameIncludes: ["Peixe tilápia grelhada", "Peito de frango grelhado"], grams: 140 },
      { nameIncludes: ["Abobrinha cozida", "Brócolis cozido", "Salada de folhas"], grams: 100 },
      { nameIncludes: ["Azeite de oliva"], grams: 5 },
    ],
  },
];

const FALLBACK_SLOT: SlotFood[] = [
  { nameIncludes: ["Banana prata"], grams: 100 },
  { nameIncludes: ["Peito de frango grelhado"], grams: 100 },
  { nameIncludes: ["Arroz branco cozido"], grams: 100 },
];

function findFood(foods: Food[], names: string[]): Food | undefined {
  for (const n of names) {
    const hit = foods.find((f) => f.name.toLowerCase() === n.toLowerCase());
    if (hit) return hit;
  }
  for (const n of names) {
    const q = n.toLowerCase();
    const hit = foods.find((f) => f.name.toLowerCase().includes(q));
    if (hit) return hit;
  }
  return undefined;
}

function toItem(food: Food, grams: number): MealItem {
  return {
    id: uid(),
    foodId: food.id,
    foodName: food.name,
    grams,
    per100: {
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sodium: food.sodium,
    },
    substitutions: [],
  };
}

function mealKcal(items: MealItem[]): number {
  return items.reduce((s, it) => s + (it.per100.kcal * it.grams) / 100, 0);
}

function scaleMealToTarget(items: MealItem[], targetKcal: number): MealItem[] {
  const cur = mealKcal(items);
  if (cur <= 0 || targetKcal <= 0) return items;
  const factor = targetKcal / cur;
  return items.map((it) => ({
    ...it,
    grams: Math.max(5, Math.round(it.grams * factor)),
  }));
}

function foodsForMealName(name: string): SlotFood[] {
  for (const slot of SLOT_TEMPLATES) {
    if (slot.match.test(name)) return slot.foods;
  }
  return FALLBACK_SLOT;
}

/** Monta refeições do dia com alimentos da tabela, perto da meta calórica. */
export function buildAutoMeals(plan: DietPlan, foods: Food[]): Meal[] {
  const base =
    plan.meals?.length > 0
      ? plan.meals.map((m) => ({
          id: uid(),
          name: m.name,
          time: m.time,
          kcalLimit: m.kcalLimit,
          items: [] as MealItem[],
        }))
      : defaultMeals();

  const target = plan.targetKcal > 0 ? plan.targetKcal : 2000;
  const weights = base.map((m) => mealKcalWeight(m.name));
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;

  return base.map((meal, i) => {
    const slotTarget =
      meal.kcalLimit && meal.kcalLimit > 0
        ? meal.kcalLimit
        : Math.round((target * weights[i]) / sumW);
    const items: MealItem[] = [];
    for (const slot of foodsForMealName(meal.name)) {
      const food = findFood(foods, slot.nameIncludes);
      if (food) items.push(toItem(food, slot.grams));
    }
    if (items.length === 0) {
      const any = findFood(foods, ["Peito de frango grelhado", "Arroz branco cozido"]);
      if (any) items.push(toItem(any, 100));
    }
    return {
      ...meal,
      kcalLimit: slotTarget,
      items: scaleMealToTarget(items, slotTarget),
    };
  });
}

/**
 * Cria o cardápio do dia automaticamente:
 * - se o modelo do plano já tem alimentos → copia;
 * - senão → gera sugestão com base na meta de kcal.
 */
export async function createMealDayAutomatic(
  userId: number,
  date: string,
  plan: DietPlan
): Promise<MealDay> {
  await ensureFoodsSeeded();
  const planItems = (plan.meals || []).reduce((n, m) => n + (m.items?.length || 0), 0);

  if (planItems > 0) {
    const day = await createMealDayFromPlan(userId, date, plan, { includeItems: true });
    if (day.meals.every((m) => !m.kcalLimit)) {
      return saveMealDay({
        ...day,
        meals: distributeMealKcalLimits(day.meals, plan.targetKcal),
      });
    }
    return day;
  }

  const foods = await db.foods.toArray();
  const meals = buildAutoMeals(plan, foods);
  const now = new Date().toISOString();
  const existing = await getMealDayByDate(userId, date);

  if (existing?.id) {
    const next: MealDay = {
      ...existing,
      meals: cloneMeals(meals),
      fromPlan: false,
      updatedAt: now,
    };
    await db.mealDays.put(next);
    return next;
  }

  const row: MealDay = {
    userId,
    date,
    meals,
    fromPlan: false,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.mealDays.add(row);
  return { ...row, id };
}
