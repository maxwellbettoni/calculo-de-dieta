import { ageFromBirthDate } from "./age";
import {
  ACTIVITY_FACTORS,
  calcGet,
  calcTmb,
  calcWaterMl,
  type ActivityLevel,
  type GetEquation,
} from "./calc/get";
import { macrosFromKcal } from "./calc/macros";
import { scaleNutrients, sumNutrients, type Nutrients } from "./calc/portion";
import {
  db,
  defaultMeals,
  ensureProfile,
  getAssessmentsByUserId,
  getDietPlanByUserId,
  type DietPlan,
  type Meal,
  type MealItem,
  type Profile,
} from "./db";

export async function ensureDietPlan(userId: number): Promise<DietPlan> {
  const existing = await getDietPlanByUserId(userId);
  if (existing) {
    if (!existing.goalMode && existing.id) {
      await db.dietPlans.update(existing.id, { goalMode: "manter" });
      existing.goalMode = "manter";
    }
    return existing;
  }

  const profile = await ensureProfile(userId);
  const assessments = await getAssessmentsByUserId(userId);
  const last = assessments[0];
  const weightKg = last?.weightKg || 70;
  const heightCm = last?.heightCm || 170;
  const age = profile.birthDate ? ageFromBirthDate(profile.birthDate) : 30;
  const sex =
    profile.gender === "feminino" || profile.gender === "masculino"
      ? profile.gender
      : "masculino";
  const equation: GetEquation = "mifflin";
  const activity: ActivityLevel = "moderado";
  const tmb = calcTmb(equation, weightKg, heightCm, age || 30, sex);
  const get = calcGet(tmb, activity);
  const targetKcal = get;
  const now = new Date().toISOString();
  const plan: DietPlan = {
    userId,
    name: "Meu plano",
    equation,
    activity,
    goalMode: "manter",
    weightKg,
    heightCm,
    tmb,
    get,
    targetKcal,
    carbPct: 50,
    proteinPct: 25,
    fatPct: 25,
    waterMlPerKg: 35,
    waterMl: calcWaterMl(weightKg, 35),
    meals: defaultMeals(),
    supplements: [],
    updatedAt: now,
  };
  const id = await db.dietPlans.add(plan);
  return { ...plan, id };
}

export function recomputeEnergy(
  plan: DietPlan,
  profile: Profile,
  equation: GetEquation,
  activity: ActivityLevel,
  weightKg: number,
  heightCm: number
): Pick<DietPlan, "tmb" | "get" | "waterMl"> {
  const age = profile.birthDate ? ageFromBirthDate(profile.birthDate) : 30;
  const sex =
    profile.gender === "feminino" || profile.gender === "masculino"
      ? profile.gender
      : "masculino";
  const tmb = calcTmb(equation, weightKg, heightCm, age || 30, sex);
  const get = calcGet(tmb, activity);
  return {
    tmb,
    get,
    waterMl: calcWaterMl(weightKg, plan.waterMlPerKg || 35),
  };
}

export function itemNutrients(item: MealItem): Nutrients {
  return scaleNutrients(item.per100, item.grams);
}

export function mealTotals(meal: Meal): Nutrients {
  return sumNutrients(meal.items.map(itemNutrients));
}

export function dayTotals(meals: Meal[]): Nutrients {
  return sumNutrients(meals.map(mealTotals));
}

export function planMacroTargets(plan: DietPlan) {
  return macrosFromKcal(plan.targetKcal, plan.carbPct, plan.proteinPct, plan.fatPct);
}

export function allergyHits(foodName: string, allergies: string, intolerances: string): string[] {
  const hay = foodName.toLowerCase();
  const tokens = `${allergies};${intolerances}`
    .split(/[,;/\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
  return tokens.filter((t) => hay.includes(t));
}

/** Status do limite de kcal da refeição. */
export function mealKcalLimitStatus(
  currentKcal: number,
  limit?: number
): { ok: boolean; over: boolean; pct: number; label: string } {
  if (!limit || limit <= 0) {
    return { ok: true, over: false, pct: 0, label: "Sem limite" };
  }
  const pct = Math.round((currentKcal / limit) * 100);
  const over = currentKcal > limit;
  return {
    ok: !over,
    over,
    pct,
    label: over
      ? `${Math.round(currentKcal)} / ${limit} kcal · passou ${Math.round(currentKcal - limit)}`
      : `${Math.round(currentKcal)} / ${limit} kcal`,
  };
}

export { ACTIVITY_FACTORS };
