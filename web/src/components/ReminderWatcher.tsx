"use client";

import { useEffect } from "react";
import { getSessionId } from "@/lib/auth";
import { db, ensureSettings, getDietPlanByUserId } from "@/lib/db";
import { tickReminders } from "@/lib/reminders";

/** Roda em background enquanto o app está aberto. */
export function ReminderWatcher() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const uid = getSessionId();
      if (uid == null || cancelled) return;
      const settings = await ensureSettings(uid);
      const plan = (await getDietPlanByUserId(uid)) || null;
      const { waterFired } = tickReminders(plan, settings);
      if (waterFired && settings.id) {
        await db.settings.update(settings.id, {
          lastWaterReminderAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    run();
    const id = window.setInterval(run, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
}
