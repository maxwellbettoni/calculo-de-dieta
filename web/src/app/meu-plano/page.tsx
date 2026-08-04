"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { MealKcalLimitBar } from "@/components/MealKcalLimit";
import { PageHeader } from "@/components/PageHeader";
import { getSessionId } from "@/lib/auth";
import {
  ACTIVITY_LABELS,
  type ActivityLevel,
  type GetEquation,
} from "@/lib/calc/get";
import { macroPreset } from "@/lib/calc/macros";
import {
  GOAL_MODE_DELTA,
  GOAL_MODE_LABELS,
  targetFromGet,
  type GoalMode,
} from "@/lib/goal-mode";
import {
  allergyHits,
  dayTotals,
  ensureDietPlan,
  itemNutrients,
  mealKcalLimitStatus,
  mealTotals,
  planMacroTargets,
  recomputeEnergy,
} from "@/lib/diet";
import {
  db,
  distributeMealKcalLimits,
  ensureFoodsSeeded,
  getAnamnesisByUserId,
  getAssessmentsByUserId,
  ensureProfile,
  uid,
  type DietPlan,
  type Food,
  type Meal,
  type MealItem,
  type Profile,
  type Supplement,
} from "@/lib/db";

type Tab = "metas" | "cardapio" | "extras";

export default function MeuPlanoPage() {
  return (
    <Suspense
      fallback={
        <AuthGate>
          <p className="muted">Carregando plano…</p>
        </AuthGate>
      }
    >
      <MeuPlanoInner />
    </Suspense>
  );
}

function MeuPlanoInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("cardapio");
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allergies, setAllergies] = useState("");
  const [intolerances, setIntolerances] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [foodQ, setFoodQ] = useState("");
  const [addMealId, setAddMealId] = useState<string | null>(null);
  const [grams, setGrams] = useState("100");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const userId = getSessionId();
    if (userId == null) return;
    await ensureFoodsSeeded();
    const p = await ensureProfile(userId);
    setProfile(p);
    const anam = await getAnamnesisByUserId(userId);
    setAllergies(anam?.allergies || "");
    setIntolerances(anam?.intolerances || "");
    let d = await ensureDietPlan(userId);
    const assessments = await getAssessmentsByUserId(userId);
    if (assessments[0] && (!d.weightKg || d.weightKg === 70)) {
      d = {
        ...d,
        weightKg: assessments[0].weightKg,
        heightCm: assessments[0].heightCm,
      };
    }
    setPlan(d);
    setFoods(await db.foods.orderBy("name").toArray());
    if (d.meals[0]) setAddMealId(d.meals[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "metas" || t === "cardapio" || t === "extras") setTab(t);
  }, [searchParams]);

  const macros = plan ? planMacroTargets(plan) : null;
  const day = plan ? dayTotals(plan.meals) : null;

  const filteredFoods = useMemo(() => {
    const q = foodQ.trim().toLowerCase();
    if (!q) return foods.slice(0, 40);
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 40);
  }, [foods, foodQ]);

  function flash(t: string) {
    setMsg(t);
    setErr("");
    setTimeout(() => setMsg(""), 2500);
  }

  async function persist(next: DietPlan) {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    if (updated.id) await db.dietPlans.update(updated.id, updated);
    else {
      const id = await db.dietPlans.add(updated);
      updated.id = id;
    }
    setPlan(updated);
  }

  async function saveMetas(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!plan || !profile) return;
    const fd = new FormData(e.currentTarget);
    const equation = String(fd.get("equation")) as GetEquation;
    const activity = String(fd.get("activity")) as ActivityLevel;
    const weightKg = Number(String(fd.get("weightKg")).replace(",", "."));
    const heightCm = Number(String(fd.get("heightCm")).replace(",", "."));
    const targetKcal = Number(String(fd.get("targetKcal")).replace(",", "."));
    const carbPct = Number(String(fd.get("carbPct")).replace(",", "."));
    const proteinPct = Number(String(fd.get("proteinPct")).replace(",", "."));
    const fatPct = Number(String(fd.get("fatPct")).replace(",", "."));
    const waterMlPerKg = Number(String(fd.get("waterMlPerKg")).replace(",", ".")) || 35;

    if (!(weightKg > 0 && heightCm > 0 && targetKcal > 0)) {
      setErr("Peso, altura e meta kcal devem ser válidos.");
      return;
    }
    if (Math.abs(carbPct + proteinPct + fatPct - 100) > 0.5) {
      setErr("A soma dos macros deve ser 100%.");
      return;
    }
    if (!profile.birthDate || (profile.gender !== "feminino" && profile.gender !== "masculino")) {
      setErr("Preencha nascimento e sexo no perfil para o GET.");
      return;
    }

    const energy = recomputeEnergy(plan, profile, equation, activity, weightKg, heightCm);
    await persist({
      ...plan,
      equation,
      activity,
      weightKg,
      heightCm,
      ...energy,
      waterMlPerKg,
      waterMl: Math.round(weightKg * waterMlPerKg),
      targetKcal: Math.round(targetKcal),
      carbPct,
      proteinPct,
      fatPct,
    });
    flash("Metas salvas.");
  }

  async function applyPreset(kind: "equilibrado" | "lowcarb" | "hipertrofia" | "cutting") {
    if (!plan) return;
    const p = macroPreset(kind);
    await persist({ ...plan, ...p });
    flash(`Preset ${kind} aplicado — salve se alterar outros campos.`);
  }

  async function useGetAsTarget() {
    if (!plan) return;
    await persist({ ...plan, targetKcal: plan.get, goalMode: "manter" });
    flash("Meta = GET (manter).");
  }

  async function applyGoalMode(mode: GoalMode) {
    if (!plan || !profile) return;
    const energy = recomputeEnergy(
      plan,
      profile,
      plan.equation,
      plan.activity,
      plan.weightKg,
      plan.heightCm
    );
    const targetKcal = targetFromGet(energy.get, mode);
    await persist({
      ...plan,
      ...energy,
      goalMode: mode,
      targetKcal,
    });
    flash(
      `${GOAL_MODE_LABELS[mode]}: meta ${targetKcal} kcal (GET ${energy.get}${GOAL_MODE_DELTA[mode] >= 0 ? "+" : ""}${GOAL_MODE_DELTA[mode]}).`
    );
  }

  function updateMeal(mealId: string, patch: Partial<Meal>) {
    if (!plan) return;
    void persist({
      ...plan,
      meals: plan.meals.map((m) => (m.id === mealId ? { ...m, ...patch } : m)),
    });
  }

  async function addMeal() {
    if (!plan) return;
    const m: Meal = { id: uid(), name: "Nova refeição", time: "15:00", items: [] };
    await persist({ ...plan, meals: [...plan.meals, m] });
    setAddMealId(m.id);
  }

  async function removeMeal(mealId: string) {
    if (!plan || plan.meals.length <= 1) return;
    await persist({ ...plan, meals: plan.meals.filter((m) => m.id !== mealId) });
  }

  async function distributeLimits() {
    if (!plan) return;
    await persist({
      ...plan,
      meals: distributeMealKcalLimits(plan.meals, plan.targetKcal),
    });
    flash("Limites de kcal distribuídos pelas refeições.");
  }

  async function addFoodToMeal(food: Food) {
    if (!plan || !addMealId) return;
    const g = Number(String(grams).replace(",", ".")) || 100;
    const meal = plan.meals.find((m) => m.id === addMealId);
    if (!meal) return;
    const addKcal = Math.round((food.kcal * g) / 100);
    const nextKcal = mealTotals(meal).kcal + addKcal;
    if (meal.kcalLimit && meal.kcalLimit > 0 && nextKcal > meal.kcalLimit) {
      const ok = window.confirm(
        `${meal.name} ficaria com ${nextKcal} kcal (limite ${meal.kcalLimit}). Adicionar mesmo assim?`
      );
      if (!ok) return;
    }
    const item: MealItem = {
      id: uid(),
      foodId: food.id,
      foodName: food.name,
      grams: g,
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
    await persist({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === addMealId ? { ...m, items: [...m.items, item] } : m
      ),
    });
    flash(`${food.name} adicionado.`);
  }

  async function removeItem(mealId: string, itemId: string) {
    if (!plan) return;
    await persist({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
      ),
    });
  }

  async function addSubstitution(mealId: string, itemId: string) {
    if (!plan) return;
    const name = prompt("Alimento substituto:");
    if (!name?.trim()) return;
    const gRaw = prompt("Gramas do substituto:", "100");
    const g = Number(String(gRaw || "100").replace(",", ".")) || 100;
    await persist({
      ...plan,
      meals: plan.meals.map((m) =>
        m.id !== mealId
          ? m
          : {
              ...m,
              items: m.items.map((i) =>
                i.id !== itemId
                  ? i
                  : {
                      ...i,
                      substitutions: [...i.substitutions, { name: name.trim(), grams: g }],
                    }
              ),
            }
      ),
    });
  }

  async function saveSupplement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!plan) return;
    const fd = new FormData(e.currentTarget);
    const s: Supplement = {
      id: uid(),
      name: String(fd.get("name") || "").trim(),
      dose: String(fd.get("dose") || "").trim(),
      time: String(fd.get("time") || "").trim(),
      form: String(fd.get("form") || "").trim(),
    };
    if (!s.name) return;
    await persist({ ...plan, supplements: [...plan.supplements, s] });
    e.currentTarget.reset();
    flash("Suplemento adicionado.");
  }

  async function removeSupplement(id: string) {
    if (!plan) return;
    await persist({ ...plan, supplements: plan.supplements.filter((s) => s.id !== id) });
  }

  async function duplicatePlan() {
    if (!plan) return;
    const copy: DietPlan = {
      ...plan,
      id: undefined,
      name: `${plan.name} (cópia)`,
      meals: plan.meals.map((m) => ({
        ...m,
        id: uid(),
        items: m.items.map((i) => ({ ...i, id: uid() })),
      })),
      supplements: plan.supplements.map((s) => ({ ...s, id: uid() })),
      updatedAt: new Date().toISOString(),
    };
    // replace current with copy as active (single plan model: overwrite)
    if (plan.id) await db.dietPlans.delete(plan.id);
    const id = await db.dietPlans.add(copy);
    setPlan({ ...copy, id });
    flash("Plano duplicado (cópia ativa).");
  }

  if (!plan) {
    return (
      <AuthGate>
        <p className="muted">Carregando plano…</p>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="page-wide">
        <PageHeader
          title="Meu plano"
          description="Registre refeições, metas calóricas, água e suplementos."
          actions={
            <button type="button" className="btn-ghost text-sm" onClick={duplicatePlan}>
              Duplicar plano
            </button>
          }
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["cardapio", "Refeições"],
              ["metas", "Metas e GET"],
              ["extras", "Água e suplementos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                tab === id
                  ? "btn-primary !py-3 !px-5 text-base"
                  : "btn-ghost !py-3 !px-5 text-base"
              }
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {msg && <p className="mt-3 text-sm text-[var(--ok)]">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        {tab === "metas" && (
          <form onSubmit={saveMetas} className="card mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="equation">
                  Equação TMB
                </label>
                <select id="equation" name="equation" className="input" defaultValue={plan.equation}>
                  <option value="mifflin">Mifflin-St Jeor</option>
                  <option value="harris">Harris-Benedict</option>
                  <option value="fao">FAO/OMS (Schofield)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="activity">
                  Fator de atividade
                </label>
                <select id="activity" name="activity" className="input" defaultValue={plan.activity}>
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {ACTIVITY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="weightKg">
                  Peso (kg)
                </label>
                <input
                  id="weightKg"
                  name="weightKg"
                  className="input font-mono-num"
                  defaultValue={plan.weightKg}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="heightCm">
                  Altura (cm)
                </label>
                <input
                  id="heightCm"
                  name="heightCm"
                  className="input font-mono-num"
                  defaultValue={plan.heightCm}
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-[var(--teal-soft)] p-4 text-sm text-[var(--teal-deep)] sm:grid-cols-3">
              <p>
                TMB <span className="font-mono-num font-semibold">{plan.tmb}</span> kcal
              </p>
              <p>
                GET <span className="font-mono-num font-semibold">{plan.get}</span> kcal
              </p>
              <p>
                Água{" "}
                <span className="font-mono-num font-semibold">{plan.waterMl}</span> ml
              </p>
            </div>

            <div>
              <p className="label">Objetivo do plano</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GOAL_MODE_LABELS) as GoalMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={
                      (plan.goalMode || "manter") === mode
                        ? "btn-primary !py-2"
                        : "btn-ghost !py-2"
                    }
                    onClick={() => applyGoalMode(mode)}
                  >
                    {GOAL_MODE_LABELS[mode]}
                    <span className="ml-1 text-xs opacity-80">
                      ({GOAL_MODE_DELTA[mode] >= 0 ? "+" : ""}
                      {GOAL_MODE_DELTA[mode]})
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs muted">
                Ajusta a meta a partir do GET: −500 perder · 0 manter · +300 ganhar.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="targetKcal">
                  Meta calórica (kcal)
                </label>
                <input
                  id="targetKcal"
                  name="targetKcal"
                  className="input font-mono-num"
                  key={`kcal-${plan.targetKcal}-${plan.goalMode}`}
                  defaultValue={plan.targetKcal}
                  required
                />
                <button type="button" className="mt-2 text-xs text-[var(--teal)] underline" onClick={useGetAsTarget}>
                  Usar GET como meta
                </button>
              </div>
              <div>
                <label className="label" htmlFor="waterMlPerKg">
                  Água (ml/kg)
                </label>
                <input
                  id="waterMlPerKg"
                  name="waterMlPerKg"
                  className="input font-mono-num"
                  defaultValue={plan.waterMlPerKg}
                />
              </div>
            </div>

            <div>
              <p className="label">Macros (%)</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {(["equilibrado", "lowcarb", "hipertrofia", "cutting"] as const).map((k) => (
                  <button key={k} type="button" className="btn-ghost !py-1 !px-2 text-xs" onClick={() => applyPreset(k)}>
                    {k}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="carbPct">
                    Carboidratos %
                  </label>
                  <input id="carbPct" name="carbPct" className="input font-mono-num" defaultValue={plan.carbPct} />
                </div>
                <div>
                  <label className="label" htmlFor="proteinPct">
                    Proteínas %
                  </label>
                  <input
                    id="proteinPct"
                    name="proteinPct"
                    className="input font-mono-num"
                    defaultValue={plan.proteinPct}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="fatPct">
                    Lipídios %
                  </label>
                  <input id="fatPct" name="fatPct" className="input font-mono-num" defaultValue={plan.fatPct} />
                </div>
              </div>
              {macros && (
                <p className="mt-2 text-sm muted">
                  ≈ Proteína {macros.proteinG} g · Carboidrato {macros.carbG} g · Gordura{" "}
                  {macros.fatG} g
                  {!macros.ok && <span className="text-red-600"> — soma ≠ 100%</span>}
                </p>
              )}
            </div>

            {!profile?.birthDate && (
              <p className="text-sm text-[var(--warn)]">
                Complete o{" "}
                <Link href="/perfil" className="underline">
                  perfil
                </Link>{" "}
                (nascimento/sexo).
              </p>
            )}

            <button type="submit" className="btn-primary">
              Salvar metas
            </button>
          </form>
        )}

        {tab === "cardapio" && (
          <div className="mt-6 space-y-6">
            <div className="accent-panel px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)]">
                Modelo do cardápio
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-[var(--teal-deep)]">
                Base para criar cada dia
              </h3>
              <p className="mt-2 text-sm text-[var(--teal-deep)]/80">
                Monte aqui o padrão de refeições. Em{" "}
                <Link href="/refeicoes" className="font-semibold underline">
                  Refeições
                </Link>{" "}
                você cria o cardápio do dia (botão automático) e pode mudar só aquele dia.
              </p>
            </div>

            {day && macros && (
              <div className="card text-sm">
                <p className="font-semibold">Totais do dia vs meta</p>
                <p className="mt-2 font-mono-num">
                  {day.kcal} / {plan.targetKcal} kcal · Proteína {day.protein}g /{" "}
                  {macros.proteinG}g · Carboidrato {day.carbs}g / {macros.carbG}g · Gordura{" "}
                  {day.fat}g / {macros.fatG}g
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm muted">Limite de kcal por refeição</p>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--teal)] underline"
                onClick={() => distributeLimits()}
              >
                Distribuir pela meta do dia
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.meals.map((meal) => {
                const tot = mealTotals(meal);
                const selected = addMealId === meal.id;
                const st = mealKcalLimitStatus(tot.kcal, meal.kcalLimit);
                return (
                  <button
                    key={`pick-${meal.id}`}
                    type="button"
                    onClick={() => {
                      setAddMealId(meal.id);
                      document.getElementById("painel-adicionar")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className={`rounded-2xl border-2 px-4 py-4 text-left transition ${
                      selected
                        ? "border-[var(--teal)] bg-[var(--teal-soft)] shadow-md"
                        : st.over
                          ? "border-[#b45309]/50 bg-[#fff7ed]"
                          : "border-[var(--line)] bg-white hover:border-[var(--teal)]/50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">
                      {meal.time}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">{meal.name}</p>
                    <p className="mt-2 font-mono-num text-sm muted">
                      {meal.kcalLimit
                        ? `${tot.kcal} / ${meal.kcalLimit} kcal`
                        : `${tot.kcal} kcal`}{" "}
                      · {meal.items.length} item(ns)
                    </p>
                    <div className="mt-2">
                      <MealKcalLimitBar currentKcal={tot.kcal} limit={meal.kcalLimit} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              id="painel-adicionar"
              className="card space-y-4 border-2 border-[var(--teal)]/30 shadow-sm"
            >
              <h3 className="font-display text-xl font-bold">Adicionar alimento</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Refeição</label>
                  <select
                    className="input text-base !py-3"
                    value={addMealId || ""}
                    onChange={(e) => setAddMealId(e.target.value)}
                  >
                    {plan.meals.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantidade (gramas)</label>
                  <input
                    className="input font-mono-num text-base !py-3"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Buscar alimento</label>
                  <input
                    className="input text-base !py-3"
                    placeholder="Ex.: frango, arroz, banana…"
                    value={foodQ}
                    onChange={(e) => setFoodQ(e.target.value)}
                    autoFocus={tab === "cardapio"}
                  />
                </div>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
                {filteredFoods.map((f) => {
                  const hits = allergyHits(f.name, allergies, intolerances);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-[var(--bg)]"
                    >
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-xs muted">
                          {f.kcal} kcal/100g · {f.category}
                          {hits.length > 0 && (
                            <span className="ml-2 text-[var(--warn)]">⚠ {hits.join(", ")}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary !py-2 !px-4 shrink-0"
                        onClick={() => addFoodToMeal(f)}
                      >
                        Adicionar
                      </button>
                    </li>
                  );
                })}
                {filteredFoods.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm muted">
                    Nenhum alimento. Tente outro nome.
                  </li>
                )}
              </ul>
            </div>

            <h3 className="font-display text-xl font-bold">Suas refeições</h3>

            {plan.meals.map((meal) => {
              const tot = mealTotals(meal);
              const selected = addMealId === meal.id;
              return (
                <section
                  key={meal.id}
                  className={`card space-y-3 ${
                    selected ? "ring-2 ring-[var(--teal)]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold">
                        {meal.name}{" "}
                        <span className="text-base font-normal muted">{meal.time}</span>
                      </p>
                      <p className="mt-1 font-mono-num text-sm text-[var(--teal)]">
                        {tot.kcal} kcal · Proteína {tot.protein}g · Carboidrato {tot.carbs}g ·
                        Gordura {tot.fat}g
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setAddMealId(meal.id);
                        document.getElementById("painel-adicionar")?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    >
                      + Registrar alimento
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className="label">Nome da refeição</label>
                      <input
                        className="input"
                        value={meal.name}
                        onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="w-28">
                      <label className="label">Horário</label>
                      <input
                        type="time"
                        className="input"
                        value={meal.time}
                        onChange={(e) => updateMeal(meal.id, { time: e.target.value })}
                      />
                    </div>
                    <div className="w-28">
                      <label className="label">Limite kcal</label>
                      <input
                        className="input font-mono-num"
                        inputMode="numeric"
                        placeholder="ex. 500"
                        value={meal.kcalLimit ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) {
                            updateMeal(meal.id, { kcalLimit: undefined });
                            return;
                          }
                          const n = Number(raw.replace(",", "."));
                          if (Number.isFinite(n) && n >= 0) {
                            updateMeal(meal.id, { kcalLimit: Math.round(n) });
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-ghost text-xs text-red-600"
                      onClick={() => removeMeal(meal.id)}
                    >
                      Remover refeição
                    </button>
                  </div>
                  <MealKcalLimitBar currentKcal={tot.kcal} limit={meal.kcalLimit} />
                  {meal.items.length === 0 ? (
                    <button
                      type="button"
                      className="w-full rounded-xl border-2 border-dashed border-[var(--teal)]/40 bg-[var(--teal-soft)]/50 py-6 text-sm font-semibold text-[var(--teal)]"
                      onClick={() => {
                        setAddMealId(meal.id);
                        document.getElementById("painel-adicionar")?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    >
                      Vazio — toque para registrar o primeiro alimento
                    </button>
                  ) : (
                    <ul className="divide-y divide-[var(--line)] text-sm">
                      {meal.items.map((item) => {
                        const n = itemNutrients(item);
                        const hits = allergyHits(item.foodName, allergies, intolerances);
                        return (
                          <li key={item.id} className="py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {item.foodName}{" "}
                                  <span className="font-mono-num muted">
                                    {item.grams} g
                                  </span>
                                </p>
                                <p className="text-xs font-mono-num muted">
                                  {n.kcal} kcal · Proteína {n.protein}g · Carboidrato {n.carbs}g ·
                                  Gordura {n.fat}g
                                  {hits.length > 0 && (
                                    <span className="ml-2 text-[var(--warn)]">⚠ alergia/intol.</span>
                                  )}
                                </p>
                                {item.substitutions.length > 0 && (
                                  <p className="mt-1 text-xs muted">
                                    Substituições:{" "}
                                    {item.substitutions
                                      .map((s) => `${s.name} (${s.grams}g)`)
                                      .join(" · ")}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="btn-ghost !py-1 !px-2 text-xs"
                                  onClick={() => addSubstitution(meal.id, item.id)}
                                >
                                  Subst.
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost !py-1 !px-2 text-xs text-red-600"
                                  onClick={() => removeItem(meal.id, item.id)}
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}

            <button type="button" className="btn-ghost w-full !py-3" onClick={addMeal}>
              + Nova refeição no dia
            </button>
          </div>
        )}

        {tab === "extras" && (
          <div className="mt-6 space-y-6">
            <section className="card">
              <h3 className="font-semibold">Hidratação</h3>
              <p className="mt-2 text-sm muted">
                Recomendado:{" "}
                <span className="font-mono-num font-semibold text-[var(--teal)]">{plan.waterMl} ml</span>
                /dia ({plan.waterMlPerKg} ml/kg × {plan.weightKg} kg). Ajuste em Metas.
              </p>
            </section>

            <section className="card space-y-4">
              <h3 className="font-semibold">Suplementos</h3>
              <form onSubmit={saveSupplement} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Nome</label>
                  <input name="name" className="input" required placeholder="Whey, creatina…" />
                </div>
                <div>
                  <label className="label">Dosagem</label>
                  <input name="dose" className="input" placeholder="30 g" />
                </div>
                <div>
                  <label className="label">Horário</label>
                  <input name="time" className="input" placeholder="Pós-treino" />
                </div>
                <div>
                  <label className="label">Forma</label>
                  <input name="form" className="input" placeholder="Shake / cápsula" />
                </div>
                <button type="submit" className="btn-primary sm:col-span-2">
                  Adicionar suplemento
                </button>
              </form>
              {plan.supplements.length === 0 ? (
                <p className="text-sm muted">Nenhum suplemento prescrito.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)] text-sm">
                  {plan.supplements.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 py-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs muted">
                          {s.dose} · {s.time} · {s.form}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost !py-1 text-xs text-red-600"
                        onClick={() => removeSupplement(s.id)}
                      >
                        Excluir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
