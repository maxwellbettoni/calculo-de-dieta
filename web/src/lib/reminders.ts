import type { DietPlan } from "./db";
import type { UserSettings } from "./db";

const FIRED_KEY = "dieta_reminders_fired_v1";

type FiredMap = Record<string, string>; // key -> YYYY-MM-DD

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadFired(): FiredMap {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") as FiredMap;
  } catch {
    return {};
  }
}

function saveFired(map: FiredMap) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(map));
}

function markFired(key: string) {
  const map = loadFired();
  map[key] = todayKey();
  saveFired(map);
}

function alreadyFired(key: string): boolean {
  return loadFired()[key] === todayKey();
}

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // ignore
  }
}

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseHHMM(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Checa refeições e água; dispara no máximo 1x por chave/dia. Retorna se água disparou. */
export function tickReminders(
  plan: DietPlan | null,
  settings: UserSettings | null
): { waterFired: boolean } {
  if (!settings?.remindersEnabled) return { waterFired: false };
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    return { waterFired: false };
  }

  const now = minutesNow();
  let waterFired = false;

  if (settings.mealReminders && plan) {
    for (const meal of plan.meals) {
      const at = parseHHMM(meal.time);
      if (at == null) continue;
      if (now >= at && now <= at + 1) {
        const key = `meal_${meal.id}_${meal.time}`;
        if (!alreadyFired(key)) {
          notify("Hora de comer", `${meal.name} · ${meal.time}`);
          markFired(key);
        }
      }
    }
  }

  if (settings.waterReminders) {
    const interval = settings.waterIntervalMin || 120;
    const last = settings.lastWaterReminderAt
      ? new Date(settings.lastWaterReminderAt).getTime()
      : 0;
    const elapsedMin = last ? (Date.now() - last) / 60000 : interval;
    if (now >= 7 * 60 && now <= 22 * 60 && elapsedMin >= interval) {
      const key = `water_${Math.floor(now / interval)}`;
      if (!alreadyFired(key)) {
        const ml = plan?.waterMl || 2000;
        notify("Hora de beber água", `Meta do dia: ${ml} ml · Beba um copo agora.`);
        markFired(key);
        waterFired = true;
      }
    }
  }

  return { waterFired };
}

export function nextReminderPreview(
  plan: DietPlan | null,
  settings: UserSettings | null
): string | null {
  if (!settings?.remindersEnabled) return null;
  const now = minutesNow();
  const upcoming: { min: number; label: string }[] = [];

  if (settings.mealReminders && plan) {
    for (const meal of plan.meals) {
      const at = parseHHMM(meal.time);
      if (at != null && at >= now) upcoming.push({ min: at, label: `${meal.name} (${meal.time})` });
    }
  }
  if (settings.waterReminders) {
    const interval = settings.waterIntervalMin || 120;
    const nextWater = Math.ceil((now + 1) / interval) * interval;
    if (nextWater <= 22 * 60) {
      const h = Math.floor(nextWater / 60);
      const m = String(nextWater % 60).padStart(2, "0");
      upcoming.push({ min: nextWater, label: `Água (~${h}:${m})` });
    }
  }
  upcoming.sort((a, b) => a.min - b.min);
  return upcoming[0]?.label || null;
}
