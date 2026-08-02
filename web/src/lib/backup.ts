import {
  db,
  getAnamnesisByUserId,
  getAssessmentsByUserId,
  getDietPlanByUserId,
  getProfileByUserId,
  getSettingsByUserId,
  type BackupPayload,
  type User,
} from "./db";
import { hashPassword } from "./auth";

function stripIds<T extends { id?: number; userId?: number }>(
  row: T
): Omit<T, "id" | "userId"> {
  const rest = { ...row };
  delete rest.id;
  delete rest.userId;
  return rest;
}

export async function exportUserBackup(userId: number): Promise<BackupPayload> {
  const user = await db.users.get(userId);
  if (!user) throw new Error("Usuário não encontrado.");
  const profile = await getProfileByUserId(userId);
  const anamnesis = await getAnamnesisByUserId(userId);
  const assessments = await getAssessmentsByUserId(userId);
  const dietPlan = await getDietPlanByUserId(userId);
  const recipes = await db.recipes.where("userId").equals(userId).toArray();
  const activityDays = await db.activityDays.where("userId").equals(userId).toArray();
  const mealDays = await db.mealDays.where("userId").equals(userId).toArray();
  const settings = await getSettingsByUserId(userId);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    },
    profile: profile ? stripIds(profile) : null,
    anamnesis: anamnesis ? stripIds(anamnesis) : null,
    assessments: assessments.map((a) => stripIds(a)),
    dietPlan: dietPlan ? stripIds(dietPlan) : null,
    recipes: recipes.map((r) => stripIds(r)),
    activityDays: activityDays.map((a) => stripIds(a)),
    mealDays: mealDays.map((m) => stripIds(m)),
    settings: settings ? stripIds(settings) : null,
  };
}

export async function importUserBackup(
  payload: BackupPayload,
  targetUserId: number | null
): Promise<number> {
  if (payload.version !== 1 || !payload.user?.name || !payload.user?.passwordHash) {
    throw new Error("Arquivo de backup inválido.");
  }

  let userId = targetUserId;
  if (userId == null) {
    userId = await db.users.add({
      name: payload.user.name,
      passwordHash: payload.user.passwordHash,
      createdAt: payload.user.createdAt || new Date().toISOString(),
    });
  } else {
    await db.users.update(userId, {
      name: payload.user.name,
      passwordHash: payload.user.passwordHash,
    });
  }

  const existingProfile = await getProfileByUserId(userId);
  if (payload.profile) {
    const row = { ...payload.profile, userId };
    if (existingProfile?.id) await db.profiles.update(existingProfile.id, row);
    else await db.profiles.add(row);
  }

  const existingAnam = await getAnamnesisByUserId(userId);
  if (payload.anamnesis) {
    const row = { ...payload.anamnesis, userId };
    if (existingAnam?.id) await db.anamneses.update(existingAnam.id, row);
    else await db.anamneses.add(row);
  }

  if (payload.assessments) {
    const old = await db.assessments.where("userId").equals(userId).toArray();
    await db.assessments.bulkDelete(old.map((a) => a.id!).filter(Boolean));
    if (payload.assessments.length) {
      await db.assessments.bulkAdd(
        payload.assessments.map((a) => ({
          ...a,
          userId,
          circumferences: a.circumferences || {},
          skinfolds: a.skinfolds || {},
          bio: a.bio || {},
          notes: a.notes || "",
        }))
      );
    }
  }

  if (payload.dietPlan !== undefined) {
    const oldPlan = await getDietPlanByUserId(userId);
    if (oldPlan?.id) await db.dietPlans.delete(oldPlan.id);
    if (payload.dietPlan) {
      await db.dietPlans.add({
        ...payload.dietPlan,
        userId,
        goalMode: payload.dietPlan.goalMode || "manter",
        meals: payload.dietPlan.meals || [],
        supplements: payload.dietPlan.supplements || [],
      });
    }
  }

  if (payload.recipes) {
    const oldR = await db.recipes.where("userId").equals(userId).toArray();
    await db.recipes.bulkDelete(oldR.map((r) => r.id!).filter(Boolean));
    if (payload.recipes.length) {
      await db.recipes.bulkAdd(payload.recipes.map((r) => ({ ...r, userId })));
    }
  }

  if (payload.activityDays) {
    const oldA = await db.activityDays.where("userId").equals(userId).toArray();
    await db.activityDays.bulkDelete(oldA.map((a) => a.id!).filter(Boolean));
    if (payload.activityDays.length) {
      await db.activityDays.bulkAdd(
        payload.activityDays.map((a) => ({
          ...a,
          userId,
          exercises: a.exercises || [],
        }))
      );
    }
  }

  if (payload.mealDays) {
    const oldM = await db.mealDays.where("userId").equals(userId).toArray();
    await db.mealDays.bulkDelete(oldM.map((m) => m.id!).filter(Boolean));
    if (payload.mealDays.length) {
      await db.mealDays.bulkAdd(
        payload.mealDays.map((m) => ({
          ...m,
          userId,
          meals: m.meals || [],
          fromPlan: m.fromPlan ?? true,
        }))
      );
    }
  }

  if (payload.settings) {
    const oldS = await getSettingsByUserId(userId);
    if (oldS?.id) await db.settings.update(oldS.id, { ...payload.settings, userId });
    else await db.settings.add({ ...payload.settings, userId });
  }

  return userId;
}

export async function findUserByName(name: string): Promise<User | undefined> {
  const n = name.trim().toLowerCase();
  return db.users.filter((u) => u.name.trim().toLowerCase() === n).first();
}

export async function registerUser(name: string, password: string): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed || password.length < 6) {
    throw new Error("Informe nome e senha com pelo menos 6 caracteres.");
  }
  const exists = await findUserByName(trimmed);
  if (exists) throw new Error("Já existe uma conta com esse nome neste aparelho.");
  const passwordHash = await hashPassword(password);
  return db.users.add({
    name: trimmed,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
}

export async function loginUser(name: string, password: string): Promise<number> {
  const user = await findUserByName(name);
  if (!user?.id) throw new Error("Conta não encontrada.");
  const hash = await hashPassword(password);
  if (user.passwordHash !== hash) throw new Error("Senha incorreta.");
  return user.id;
}
