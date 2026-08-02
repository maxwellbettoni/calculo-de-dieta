import Dexie, { type Table } from "dexie";
import type { ActivityLevel, GetEquation } from "./calc/get";
import { buildFoodSeed } from "./foods-seed";
import type { GoalMode } from "./goal-mode";
import { buildRecipeSeed, RECIPE_SEED_COUNT } from "./recipes-seed";

export type User = {
  id?: number;
  name: string;
  passwordHash: string;
  createdAt: string;
};

export type Profile = {
  id?: number;
  userId: number;
  birthDate: string;
  gender: "feminino" | "masculino" | "outro" | "";
  email: string;
  phone: string;
  goal: string;
  updatedAt: string;
};

export type Anamnesis = {
  id?: number;
  userId: number;
  medicalHistory: string;
  allergies: string;
  intolerances: string;
  aversions: string;
  bowel: string;
  sleep: string;
  activityLevel: string;
  updatedAt: string;
};

export type CircumferencesCm = {
  pescoco?: number;
  peitoral?: number;
  cintura?: number;
  abdomen?: number;
  quadril?: number;
  bracoRelaxado?: number;
  bracoContraido?: number;
  antebraco?: number;
  coxaProximal?: number;
  coxaMedia?: number;
  panturrilha?: number;
};

export type SkinfoldsMm = {
  tricipital?: number;
  subescapular?: number;
  suprailiaca?: number;
  abdominal?: number;
  peitoral?: number;
  axilarMedia?: number;
  coxa?: number;
};

export type Bioimpedance = {
  bodyFatPct?: number;
  muscleMassPct?: number;
  visceralFat?: number;
};

export type Assessment = {
  id?: number;
  userId: number;
  date: string;
  weightKg: number;
  heightCm: number;
  bmi?: number;
  bmiLabel?: string;
  circumferences: CircumferencesCm;
  icq?: number;
  icqLabel?: string;
  skinfolds: SkinfoldsMm;
  pollockProtocol?: "pollock3" | "pollock7" | "";
  bodyFatPct?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  bodyFatSource?: "pollock3" | "pollock7" | "bio" | "";
  bio: Bioimpedance;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Food = {
  id?: number;
  name: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
};

export type FoodSub = {
  name: string;
  grams: number;
};

export type MealItem = {
  id: string;
  foodId?: number;
  foodName: string;
  grams: number;
  per100: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  substitutions: FoodSub[];
};

export type Meal = {
  id: string;
  name: string;
  time: string;
  items: MealItem[];
  /** Limite de kcal desta refeição (opcional). */
  kcalLimit?: number;
};

export type Supplement = {
  id: string;
  name: string;
  dose: string;
  time: string;
  form: string;
};

export type DietPlan = {
  id?: number;
  userId: number;
  name: string;
  equation: GetEquation;
  activity: ActivityLevel;
  /** perder | manter | ganhar */
  goalMode: GoalMode;
  weightKg: number;
  heightCm: number;
  tmb: number;
  get: number;
  targetKcal: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  waterMlPerKg: number;
  waterMl: number;
  meals: Meal[];
  supplements: Supplement[];
  updatedAt: string;
};

export type Recipe = {
  id?: number;
  userId: number;
  name: string;
  category: string;
  servings: number;
  prepMinutes: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string;
  isSeed?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseEntry = {
  id: string;
  name: string;
  minutes: number;
  kcal: number;
};

export type ActivityDay = {
  id?: number;
  userId: number;
  date: string;
  steps: number;
  /** origem: manual | import */
  stepsSource: "manual" | "import";
  exercises: ExerciseEntry[];
  notes: string;
  updatedAt: string;
};

/** Cardápio de um dia específico (cópia editável do plano). */
export type MealDay = {
  id?: number;
  userId: number;
  date: string;
  meals: Meal[];
  /** Se veio do plano modelo ao criar */
  fromPlan: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  id?: number;
  userId: number;
  remindersEnabled: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  waterIntervalMin: number;
  lastWaterReminderAt: string;
  stepsGoal: number;
  updatedAt: string;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  user: Omit<User, "id">;
  profile: Omit<Profile, "id" | "userId"> | null;
  anamnesis: Omit<Anamnesis, "id" | "userId"> | null;
  assessments?: Omit<Assessment, "id" | "userId">[];
  dietPlan?: Omit<DietPlan, "id" | "userId"> | null;
  recipes?: Omit<Recipe, "id" | "userId">[];
  activityDays?: Omit<ActivityDay, "id" | "userId">[];
  mealDays?: Omit<MealDay, "id" | "userId">[];
  settings?: Omit<UserSettings, "id" | "userId"> | null;
};

export class NutriDB extends Dexie {
  users!: Table<User, number>;
  profiles!: Table<Profile, number>;
  anamneses!: Table<Anamnesis, number>;
  assessments!: Table<Assessment, number>;
  foods!: Table<Food, number>;
  dietPlans!: Table<DietPlan, number>;
  recipes!: Table<Recipe, number>;
  activityDays!: Table<ActivityDay, number>;
  mealDays!: Table<MealDay, number>;
  settings!: Table<UserSettings, number>;

  constructor() {
    super("calculo-de-dieta-pessoal");
    this.version(1).stores({
      users: "++id, name, createdAt",
      profiles: "++id, userId",
      anamneses: "++id, userId",
    });
    this.version(2).stores({
      users: "++id, name, createdAt",
      profiles: "++id, userId",
      anamneses: "++id, userId",
      assessments: "++id, userId, date, createdAt",
    });
    this.version(3).stores({
      users: "++id, name, createdAt",
      profiles: "++id, userId",
      anamneses: "++id, userId",
      assessments: "++id, userId, date, createdAt",
      foods: "++id, name, category",
      dietPlans: "++id, userId, updatedAt",
    });
    this.version(4)
      .stores({
        users: "++id, name, createdAt",
        profiles: "++id, userId",
        anamneses: "++id, userId",
        assessments: "++id, userId, date, createdAt",
        foods: "++id, name, category",
        dietPlans: "++id, userId, updatedAt",
        recipes: "++id, userId, name, category",
        activityDays: "++id, userId, date",
        settings: "++id, userId",
      })
      .upgrade(async (tx) => {
        await tx
          .table("dietPlans")
          .toCollection()
          .modify((p: DietPlan) => {
            if (!p.goalMode) p.goalMode = "manter";
          });
      });
    this.version(5).stores({
      users: "++id, name, createdAt",
      profiles: "++id, userId",
      anamneses: "++id, userId",
      assessments: "++id, userId, date, createdAt",
      foods: "++id, name, category",
      dietPlans: "++id, userId, updatedAt",
      recipes: "++id, userId, name, category",
      activityDays: "++id, userId, date",
      mealDays: "++id, userId, date, [userId+date]",
      settings: "++id, userId",
    });
  }
}

export const db = new NutriDB();

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getProfileByUserId(userId: number): Promise<Profile | undefined> {
  return db.profiles.where("userId").equals(userId).first();
}

export async function getAnamnesisByUserId(userId: number): Promise<Anamnesis | undefined> {
  return db.anamneses.where("userId").equals(userId).first();
}

export async function getAssessmentsByUserId(userId: number): Promise<Assessment[]> {
  const rows = await db.assessments.where("userId").equals(userId).toArray();
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getDietPlanByUserId(userId: number): Promise<DietPlan | undefined> {
  return db.dietPlans.where("userId").equals(userId).first();
}

export async function getSettingsByUserId(userId: number): Promise<UserSettings | undefined> {
  return db.settings.where("userId").equals(userId).first();
}

export async function ensureSettings(userId: number): Promise<UserSettings> {
  const existing = await getSettingsByUserId(userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const row: UserSettings = {
    userId,
    remindersEnabled: false,
    mealReminders: true,
    waterReminders: true,
    waterIntervalMin: 120,
    lastWaterReminderAt: "",
    stepsGoal: 8000,
    updatedAt: now,
  };
  const id = await db.settings.add(row);
  return { ...row, id };
}

export async function ensureRecipesSeeded(userId: number): Promise<number> {
  const mine = await db.recipes.where("userId").equals(userId).toArray();
  const seedCount = mine.filter((r) => r.isSeed).length;
  if (seedCount < RECIPE_SEED_COUNT) {
    const seedIds = mine.filter((r) => r.isSeed && r.id != null).map((r) => r.id!);
    if (seedIds.length) await db.recipes.bulkDelete(seedIds);
    await db.recipes.bulkAdd(buildRecipeSeed(userId));
  }
  return db.recipes.where("userId").equals(userId).count();
}

export async function getActivityByDate(
  userId: number,
  date: string
): Promise<ActivityDay | undefined> {
  return db.activityDays.where("userId").equals(userId).filter((a) => a.date === date).first();
}

export async function ensureActivityDay(userId: number, date: string): Promise<ActivityDay> {
  const existing = await getActivityByDate(userId, date);
  if (existing) return existing;
  const row: ActivityDay = {
    userId,
    date,
    steps: 0,
    stepsSource: "manual",
    exercises: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
  const id = await db.activityDays.add(row);
  return { ...row, id };
}

export async function getMealDayByDate(
  userId: number,
  date: string
): Promise<MealDay | undefined> {
  return db.mealDays.where("[userId+date]").equals([userId, date]).first();
}

/** Cópia profunda das refeições com novos IDs (cada dia fica independente). */
export function cloneMeals(meals: Meal[]): Meal[] {
  return meals.map((m) => ({
    id: uid(),
    name: m.name,
    time: m.time,
    kcalLimit: m.kcalLimit,
    items: (m.items || []).map((it) => ({
      id: uid(),
      foodId: it.foodId,
      foodName: it.foodName,
      grams: it.grams,
      per100: { ...it.per100 },
      substitutions: (it.substitutions || []).map((s) => ({ ...s })),
    })),
  }));
}

/** Cria ou recria o cardápio do dia a partir do plano modelo. */
export async function createMealDayFromPlan(
  userId: number,
  date: string,
  plan: DietPlan,
  opts?: { includeItems?: boolean }
): Promise<MealDay> {
  const includeItems = opts?.includeItems !== false;
  const now = new Date().toISOString();
  const source = includeItems
    ? cloneMeals(plan.meals)
    : plan.meals.map((m) => ({
        id: uid(),
        name: m.name,
        time: m.time,
        kcalLimit: m.kcalLimit,
        items: [] as MealItem[],
      }));

  const existing = await getMealDayByDate(userId, date);
  if (existing?.id) {
    const next: MealDay = {
      ...existing,
      meals: source,
      fromPlan: true,
      updatedAt: now,
    };
    await db.mealDays.put(next);
    return next;
  }

  const row: MealDay = {
    userId,
    date,
    meals: source,
    fromPlan: true,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.mealDays.add(row);
  return { ...row, id };
}

export async function saveMealDay(day: MealDay): Promise<MealDay> {
  const next = { ...day, updatedAt: new Date().toISOString() };
  if (next.id) {
    await db.mealDays.put(next);
    return next;
  }
  const id = await db.mealDays.add(next);
  return { ...next, id };
}

export async function ensureProfile(userId: number): Promise<Profile> {
  const existing = await getProfileByUserId(userId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const row: Profile = {
    userId,
    birthDate: "",
    gender: "",
    email: "",
    phone: "",
    goal: "",
    updatedAt: now,
  };
  const id = await db.profiles.add(row);
  return { ...row, id };
}

export async function ensureFoodsSeeded(): Promise<number> {
  const seed = buildFoodSeed();
  const count = await db.foods.count();

  if (count === 0) {
    await db.foods.bulkAdd(seed);
    return db.foods.count();
  }

  if (count < seed.length) {
    await db.foods.clear();
    await db.foods.bulkAdd(seed);
    return db.foods.count();
  }

  // Seed corrido 2x (ex.: abas em paralelo) → nomes repetidos
  const all = await db.foods.toArray();
  const nameCount = new Map<string, number>();
  for (const f of all) nameCount.set(f.name, (nameCount.get(f.name) || 0) + 1);
  const hasDupes = [...nameCount.values()].some((n) => n > 1);
  if (hasDupes && nameCount.size <= seed.length) {
    await db.foods.clear();
    await db.foods.bulkAdd(seed);
    return db.foods.count();
  }

  return count;
}

export function defaultMeals(): Meal[] {
  return [
    { id: uid(), name: "Café da manhã", time: "07:30", items: [], kcalLimit: 440 },
    { id: uid(), name: "Lanche da manhã", time: "10:00", items: [], kcalLimit: 180 },
    { id: uid(), name: "Almoço", time: "12:30", items: [], kcalLimit: 640 },
    { id: uid(), name: "Lanche da tarde", time: "16:00", items: [], kcalLimit: 180 },
    { id: uid(), name: "Jantar", time: "19:30", items: [], kcalLimit: 560 },
  ];
}

/** Fração sugerida da meta diária para cada refeição (pelo nome). */
export function mealKcalWeight(name: string): number {
  const n = name.toLowerCase();
  if (/almoço/.test(n)) return 0.32;
  if (/jantar|ceia/.test(n)) return 0.28;
  if (/café/.test(n)) return 0.22;
  return 0.09;
}

/** Distribui a meta diária em limites por refeição. */
export function distributeMealKcalLimits(meals: Meal[], dayTargetKcal: number): Meal[] {
  const target = dayTargetKcal > 0 ? dayTargetKcal : 2000;
  const weights = meals.map((m) => mealKcalWeight(m.name));
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;
  return meals.map((m, i) => ({
    ...m,
    kcalLimit: Math.round((target * weights[i]) / sumW),
  }));
}
