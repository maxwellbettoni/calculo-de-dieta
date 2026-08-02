"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { getSessionId } from "@/lib/auth";
import { createMealDayAutomatic } from "@/lib/auto-meals";
import { dayTotals, ensureDietPlan, planMacroTargets } from "@/lib/diet";
import { GOAL_MODE_LABELS } from "@/lib/goal-mode";
import { todayISODate } from "@/lib/num";
import { nextReminderPreview } from "@/lib/reminders";
import {
  db,
  ensureActivityDay,
  ensureProfile,
  ensureSettings,
  getAnamnesisByUserId,
  getAssessmentsByUserId,
  getDietPlanByUserId,
  getMealDayByDate,
  type ActivityDay,
  type Assessment,
  type DietPlan,
  type MealDay,
  type Profile,
  type UserSettings,
} from "@/lib/db";

function ProgressBar({
  value,
  max,
  label,
  unit,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
}) {
  const pct = max > 0 ? Math.min(140, (value / max) * 100) : 0;
  const over = max > 0 && value > max * 1.05;
  const under = max > 0 && value < max * 0.85 && value > 0;
  const barColor = over ? "bg-[#b45309]" : under ? "bg-amber-400" : "bg-[var(--teal)]";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono-num text-slate-800">
          {Math.round(value * 10) / 10}
          <span className="text-slate-400"> / {Math.round(max * 10) / 10} {unit}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function statusFromPlan(
  plan: DietPlan | null,
  hasMealDay: boolean,
  dayKcal: number,
  target: number,
  itemsCount: number
): { label: string; tone: string; detail: string } {
  if (!plan) {
    return {
      label: "Sem plano ainda",
      tone: "text-[var(--warn)] bg-[#fff7ed]",
      detail: "Defina metas e monte o modelo em Meu plano.",
    };
  }
  if (!hasMealDay) {
    return {
      label: "Sem cardápio hoje",
      tone: "text-[var(--warn)] bg-[#fff7ed]",
      detail: "Em Refeições, toque em “Criar cardápio do dia”.",
    };
  }
  if (itemsCount === 0) {
    return {
      label: "Cardápio vazio",
      tone: "text-[var(--warn)] bg-[#fff7ed]",
      detail: "Metas ok — falta adicionar alimentos nas refeições de hoje.",
    };
  }
  if (target <= 0) {
    return {
      label: "Metas incompletas",
      tone: "text-slate-600 bg-slate-50",
      detail: "Salve uma meta calórica em Meu plano.",
    };
  }
  const ratio = dayKcal / target;
  if (ratio >= 0.9 && ratio <= 1.08) {
    return {
      label: "No alvo",
      tone: "text-[var(--ok)] bg-emerald-50",
      detail: "O cardápio do dia está alinhado com a meta calórica.",
    };
  }
  if (ratio < 0.9) {
    return {
      label: "Abaixo da meta",
      tone: "text-amber-700 bg-amber-50",
      detail: `Faltam cerca de ${Math.round(target - dayKcal)} kcal para a meta do dia.`,
    };
  }
  return {
    label: "Acima da meta",
    tone: "text-[#9a3412] bg-[#fff7ed]",
    detail: `O cardápio passa ~${Math.round(dayKcal - target)} kcal da meta.`,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasAnamnesis, setHasAnamnesis] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activity, setActivity] = useState<ActivityDay | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const uid = getSessionId();
    if (uid == null) return;
    (async () => {
      const user = await db.users.get(uid);
      setName(user?.name || "");
      setProfile(await ensureProfile(uid));
      const a = await getAnamnesisByUserId(uid);
      setHasAnamnesis(Boolean(a?.updatedAt));
      setAssessments(await getAssessmentsByUserId(uid));
      setPlan((await getDietPlanByUserId(uid)) || null);
      setMealDay((await getMealDayByDate(uid, todayISODate())) || null);
      setSettings(await ensureSettings(uid));
      setActivity(await ensureActivityDay(uid, todayISODate()));
    })();
  }, []);

  const lastAssess = assessments[0] || null;
  const prevAssess = assessments[1] || null;
  const profileReady = Boolean(profile?.birthDate && profile?.gender && profile?.goal);

  const mealsToday = mealDay?.meals ?? null;
  const day = useMemo(() => (mealsToday ? dayTotals(mealsToday) : null), [mealsToday]);
  const macros = useMemo(() => (plan ? planMacroTargets(plan) : null), [plan]);
  const itemsCount = useMemo(
    () => (mealsToday ? mealsToday.reduce((n, m) => n + m.items.length, 0) : 0),
    [mealsToday]
  );
  const mealsFilled = useMemo(
    () => (mealsToday ? mealsToday.filter((m) => m.items.length > 0).length : 0),
    [mealsToday]
  );

  const status = statusFromPlan(
    plan,
    Boolean(mealDay),
    day?.kcal || 0,
    plan?.targetKcal || 0,
    itemsCount
  );

  const weightDelta =
    lastAssess && prevAssess
      ? Math.round((lastAssess.weightKg - prevAssess.weightKg) * 10) / 10
      : null;

  async function createTodayAutomatic() {
    const uid = getSessionId();
    if (uid == null) return;
    setCreating(true);
    try {
      const p = plan || (await ensureDietPlan(uid));
      await createMealDayAutomatic(uid, todayISODate(), p);
      router.push("/refeicoes");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AuthGate>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-slate-500">Olá{name ? `, ${name}` : ""}</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Início</h2>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Seu espaço para montar a dieta e acompanhar medidas e evolução.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-sm text-slate-500">Perfil</p>
            <p className="mt-2 text-lg font-semibold text-[var(--teal)]">
              {profileReady ? "Preenchido" : "Completar"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Anamnese</p>
            <p className="mt-2 text-lg font-semibold text-[var(--teal)]">
              {hasAnamnesis ? "Salva" : "Pendente"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-500">Último peso</p>
            <p className="mt-2 text-lg font-semibold text-[var(--teal)] font-mono-num">
              {lastAssess ? `${lastAssess.weightKg} kg` : "—"}
            </p>
            {lastAssess?.bmi != null && (
              <p className="mt-1 text-xs text-slate-500">
                IMC {lastAssess.bmi}
                {lastAssess.bmiLabel ? ` · ${lastAssess.bmiLabel}` : ""}
              </p>
            )}
          </div>
        </div>
        {profile?.goal?.trim() && (
          <p className="mt-3 text-sm text-slate-600">
            Objetivo: <span className="font-medium">{profile.goal}</span>
          </p>
        )}

        <section className="mt-6 rounded-2xl border-2 border-[var(--teal)] bg-[var(--teal-soft)] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)]">
            Diário alimentar
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold text-[var(--teal-deep)]">
            Cardápio de hoje
          </h3>
          <p className="mt-2 max-w-xl text-sm text-[var(--teal-deep)]/85">
            {mealDay
              ? "Hoje já tem cardápio — abra para ver ou alterar."
              : "Um toque monta café, lanches, almoço e jantar perto da sua meta. Depois você muda o que quiser."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!mealDay ? (
              <button
                type="button"
                className="btn-primary !py-3 !px-6 text-base"
                disabled={creating}
                onClick={() => createTodayAutomatic()}
              >
                {creating ? "Criando…" : "Criar automaticamente"}
              </button>
            ) : null}
            <Link
              href="/refeicoes"
              className={
                mealDay
                  ? "btn-primary mt-0 inline-flex !py-3 !px-6 text-base"
                  : "inline-flex items-center rounded-xl border border-[var(--teal)] bg-white px-5 py-3 text-sm font-semibold text-[var(--teal)]"
              }
            >
              {mealDay ? "Abrir refeições de hoje" : "Abrir Refeições"}
            </Link>
          </div>
        </section>

        <section className="card mt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Como estou na dieta</h3>
              <p className="mt-1 text-sm text-slate-500">
                Resumo do plano, cardápio e evolução recente.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600">{status.detail}</p>

          {!plan ? (
            <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] bg-[#f3f7f5] px-4 py-6 text-center">
              <p className="text-sm text-slate-600">
                Ainda não há plano alimentar para resumir.
              </p>
              <Link href="/meu-plano" className="btn-primary mt-4 inline-flex">
                Montar meu plano
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-[#f3f7f5] px-3 py-3">
                  <p className="text-xs text-slate-500">
                    Meta
                    {plan.goalMode
                      ? ` · ${GOAL_MODE_LABELS[plan.goalMode]}`
                      : ""}
                  </p>
                  <p className="mt-1 font-mono-num text-xl font-semibold text-[var(--teal)]">
                    {plan.targetKcal}
                    <span className="text-sm font-normal text-slate-500"> kcal</span>
                  </p>
                </div>
                <div className="rounded-xl bg-[#f3f7f5] px-3 py-3">
                  <p className="text-xs text-slate-500">Cardápio</p>
                  <p className="mt-1 font-mono-num text-xl font-semibold text-[var(--teal)]">
                    {day?.kcal ?? 0}
                    <span className="text-sm font-normal text-slate-500"> kcal</span>
                  </p>
                </div>
                <div className="rounded-xl bg-[#f3f7f5] px-3 py-3">
                  <p className="text-xs text-slate-500">Água</p>
                  <p className="mt-1 font-mono-num text-xl font-semibold text-[var(--teal)]">
                    {plan.waterMl}
                    <span className="text-sm font-normal text-slate-500"> ml</span>
                  </p>
                </div>
                <div className="rounded-xl bg-[#f3f7f5] px-3 py-3">
                  <p className="text-xs text-slate-500">Refeições</p>
                  <p className="mt-1 font-mono-num text-xl font-semibold text-[var(--teal)]">
                    {mealsFilled}
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / {(mealDay?.meals.length ?? plan.meals.length) || 0}
                    </span>
                  </p>
                </div>
              </div>

              {day && macros && itemsCount > 0 && (
                <div className="mt-5 space-y-3">
                  <ProgressBar value={day.kcal} max={plan.targetKcal} label="Energia" unit="kcal" />
                  <ProgressBar value={day.carbs} max={macros.carbG} label="Carboidratos" unit="g" />
                  <ProgressBar value={day.protein} max={macros.proteinG} label="Proteínas" unit="g" />
                  <ProgressBar value={day.fat} max={macros.fatG} label="Lipídios" unit="g" />
                </div>
              )}

              <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Próximo lembrete
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {nextReminderPreview(plan, settings) ||
                      (settings?.remindersEnabled
                        ? "Nenhum restante hoje"
                        : "Desligado — ative em Conta")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Passos hoje
                  </p>
                  <p className="mt-2 text-sm text-slate-700 font-mono-num">
                    {activity?.steps || 0} / {settings?.stepsGoal || 8000}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Evolução
                  </p>
                  {weightDelta == null ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {lastAssess
                        ? "Registre mais uma avaliação para ver a variação de peso."
                        : "Nenhuma avaliação ainda — comece em Avaliação."}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-700">
                      Peso:{" "}
                      <span className="font-mono-num font-semibold">
                        {weightDelta > 0 ? "+" : ""}
                        {weightDelta} kg
                      </span>{" "}
                      vs avaliação anterior
                      {lastAssess?.bodyFatPct != null && prevAssess?.bodyFatPct != null && (
                        <>
                          {" "}
                          · %BF{" "}
                          <span className="font-mono-num font-semibold">
                            {Math.round((lastAssess.bodyFatPct - prevAssess.bodyFatPct) * 10) / 10 > 0
                              ? "+"
                              : ""}
                            {Math.round((lastAssess.bodyFatPct - prevAssess.bodyFatPct) * 10) / 10}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Suplementos
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {plan.supplements.length
                      ? `${plan.supplements.length} no plano`
                      : "Nenhum suplemento cadastrado"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/refeicoes" className="btn-primary">
                  Registrar refeições
                </Link>
                <Link href="/meu-plano?tab=metas" className="btn-ghost">
                  Ajustar metas
                </Link>
                <Link href="/evolucao" className="btn-ghost">
                  Ver gráficos
                </Link>
                {!lastAssess && (
                  <Link href="/avaliacao" className="btn-ghost">
                    Registrar peso
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AuthGate>
  );
}
