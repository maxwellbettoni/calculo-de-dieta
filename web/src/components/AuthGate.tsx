"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { AppShell } from "./AppShell";
import { ReminderWatcher } from "./ReminderWatcher";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] text-slate-500">
        Carregando…
      </div>
    );
  }

  return (
    <AppShell>
      <ReminderWatcher />
      {children}
    </AppShell>
  );
}
