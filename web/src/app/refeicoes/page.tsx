"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { MealKcalLimitBar } from "@/components/MealKcalLimit";
import { getSessionId } from "@/lib/auth";
import { createMealDayAutomatic } from "@/lib/auto-meals";
import {
  allergyHits,
  dayTotals,
  ensureDietPlan,
  mealKcalLimitStatus,
  mealTotals,
  planMacroTargets,
} from "@/lib/diet";
import {
  createMealDayFromPlan,
  db,
  distributeMealKcalLimits,
  ensureFoodsSeeded,
  getAnamnesisByUserId,
  getMealDayByDate,
  saveMealDay,
  uid,
  type DietPlan,
  type Food,
  type Meal,
  type MealDay,
  type MealItem,
} from "@/lib/db";
import { todayISODate } from "@/lib/num";

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function RefeicoesPage() {
  const [date, setDate] = useState(todayISODate());
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [allergies, setAllergies] = useState("");
  const [intolerances, setIntolerances] = useState("");
  const [foodQ, setFoodQ] = useState("");
  const [grams, setGrams] = useState("100");
  const [addMealId, setAddMealId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load(forDate: string) {
    const userId = getSessionId();
    if (userId == null) return;
    await ensureFoodsSeeded();
    const p = await ensureDietPlan(userId);
    setPlan(p);
    const anam = await getAnamnesisByUserId(userId);
    setAllergies(anam?.allergies || "");
    setIntolerances(anam?.intolerances || "");
    setFoods(await db.foods.orderBy("name").toArray());
    const day = (await getMealDayByDate(userId, forDate)) || null;
    setMealDay(day);
    if (day?.meals[0]) setAddMealId(day.meals[0].id);
    else if (p.meals[0]) setAddMealId(p.meals[0].id);
    setLoaded(true);
  }

  useEffect(() => {
    setLoaded(false);
    load(date);
  }, [date]);

  const macros = plan ? planMacroTargets(plan) : null;
  const totals = mealDay ? dayTotals(mealDay.meals) : null;

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

  async function persist(next: MealDay) {
    const saved = await saveMealDay(next);
    setMealDay(saved);
  }

  async function createAutomatic() {
    const userId = getSessionId();
    if (userId == null || !plan) return;
    if (mealDay) {
      const ok = window.confirm(
        "Isso substitui o cardápio deste dia por uma versão automática. Continuar?"
      );
      if (!ok) return;
    }
    setBusy(true);
    setErr("");
    try {
      const created = await createMealDayAutomatic(userId, date, plan);
      setMealDay(created);
      if (created.meals[0]) setAddMealId(created.meals[0].id);
      flash("Cardápio do dia criado automaticamente. Você pode alterar o que quiser.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível criar o dia.");
    } finally {
      setBusy(false);
    }
  }

  async function createBlank() {
    const userId = getSessionId();
    if (userId == null || !plan) return;
    setBusy(true);
    setErr("");
    try {
      const created = await createMealDayFromPlan(userId, date, plan, { includeItems: false });
      setMealDay(created);
      if (created.meals[0]) setAddMealId(created.meals[0].id);
      flash("Dia criado em branco — adicione os alimentos.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível criar o dia.");
    } finally {
      setBusy(false);
    }
  }

  function updateMeal(mealId: string, patch: Partial<Meal>) {
    if (!mealDay) return;
    void persist({
      ...mealDay,
      meals: mealDay.meals.map((m) => (m.id === mealId ? { ...m, ...patch } : m)),
    });
  }

  async function addFoodToMeal(food: Food) {
    if (!mealDay || !addMealId) return;
    const g = Number(String(grams).replace(",", ".")) || 100;
    const meal = mealDay.meals.find((m) => m.id === addMealId);
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
      ...mealDay,
      meals: mealDay.meals.map((m) =>
        m.id === addMealId ? { ...m, items: [...m.items, item] } : m
      ),
    });
    flash(`${food.name} adicionado.`);
  }

  async function distributeLimits() {
    if (!mealDay || !plan) return;
    await persist({
      ...mealDay,
      meals: distributeMealKcalLimits(mealDay.meals, plan.targetKcal),
    });
    flash("Limites por refeição distribuídos pela meta do dia.");
  }

  async function removeItem(mealId: string, itemId: string) {
    if (!mealDay) return;
    await persist({
      ...mealDay,
      meals: mealDay.meals.map((m) =>
        m.id === mealId ? { ...m, items: m.items.filter((i) => i.id !== itemId) } : m
      ),
    });
  }

  async function updateItemGrams(mealId: string, itemId: string, gramsRaw: string) {
    if (!mealDay) return;
    const g = Number(String(gramsRaw).replace(",", "."));
    if (!Number.isFinite(g) || g <= 0) return;
    await persist({
      ...mealDay,
      meals: mealDay.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map((i) => (i.id === itemId ? { ...i, grams: g } : i)),
            }
          : m
      ),
    });
  }

  const isToday = date === todayISODate();

  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Refeições</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cardápio de cada dia — pode criar automático e mudar só o que quiser.
        </p>

        <div className="card mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            ← Dia anterior
          </button>
          <div className="flex-1 min-w-[12rem]">
            <label className="label" htmlFor="meal-date">
              Data
            </label>
            <input
              id="meal-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISODate())}
            />
            <p className="mt-1 text-xs capitalize text-slate-500">
              {formatDateLabel(date)}
              {isToday ? " · hoje" : ""}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            Próximo dia →
          </button>
          {!isToday && (
            <button
              type="button"
              className="btn-primary !py-2"
              onClick={() => setDate(todayISODate())}
            >
              Ir para hoje
            </button>
          )}
        </div>

        {msg && <p className="mt-3 text-sm text-[var(--teal)]">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        {!loaded ? (
          <p className="mt-8 text-slate-500">Carregando…</p>
        ) : !mealDay ? (
          <div className="mt-6 rounded-2xl border-2 border-[var(--teal)] bg-[var(--teal-soft)] px-5 py-8 text-center">
            <h3 className="font-display text-2xl font-bold text-[var(--teal-deep)]">
              Criar cardápio deste dia
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--teal-deep)]/80">
              O botão automático monta café, lanches, almoço e jantar perto da sua meta de
              calorias. Depois você pode trocar qualquer coisa — só este dia muda.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="btn-primary px-8 py-4 text-lg"
                disabled={busy || !plan}
                onClick={() => createAutomatic()}
              >
                {busy ? "Criando…" : "Criar automaticamente"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-[var(--teal)] bg-white px-5 py-3 text-sm font-semibold text-[var(--teal)]"
                disabled={busy || !plan}
                onClick={() => createBlank()}
              >
                Criar dia em branco
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-600">
              Meta em{" "}
              <Link href="/meu-plano?tab=metas" className="underline text-[var(--teal)]">
                Meu plano
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <p className="text-sm text-slate-600">
                Cardápio deste dia
                {mealDay.fromPlan ? " · copiado do modelo" : " · gerado automaticamente"}
              </p>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--teal)] underline"
                disabled={busy}
                onClick={() => createAutomatic()}
              >
                Gerar de novo automaticamente
              </button>
            </div>

            {totals && macros && plan && (
              <div className="card text-sm">
                <p className="font-semibold">Totais do dia vs meta</p>
                <p className="mt-2 font-mono-num">
                  {totals.kcal} / {plan.targetKcal} kcal · Proteína {totals.protein}g /{" "}
                  {macros.proteinG}g · Carboidrato {totals.carbs}g / {macros.carbG}g · Gordura{" "}
                  {totals.fat}g / {macros.fatG}g
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">Limite de kcal por refeição</p>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--teal)] underline"
                onClick={() => distributeLimits()}
              >
                Distribuir pela meta do dia
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mealDay.meals.map((meal) => {
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
                    <p className="mt-2 font-mono-num text-sm text-slate-600">
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
              <h3 className="font-display text-xl font-bold">Adicionar / alterar alimento</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Refeição</label>
                  <select
                    className="input text-base !py-3"
                    value={addMealId || ""}
                    onChange={(e) => setAddMealId(e.target.value)}
                  >
                    {mealDay.meals.map((m) => (
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
                  />
                </div>
              </div>
              <ul className="max-h-64 overflow-y-auto divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
                {filteredFoods.map((f) => {
                  const hits = allergyHits(f.name, allergies, intolerances);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-[#f3f7f5]"
                    >
                      <div>
                        <p className="font-medium">{f.name}</p>
                        <p className="text-xs text-slate-500">
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
                  <li className="px-3 py-6 text-center text-sm text-slate-500">
                    Nenhum alimento. Tente outro nome.
                  </li>
                )}
              </ul>
            </div>

            <h3 className="font-display text-xl font-bold">Refeições do dia</h3>

            {mealDay.meals.map((meal) => {
              const tot = mealTotals(meal);
              return (
                <section key={meal.id} className="card space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[10rem]">
                      <label className="label">Nome</label>
                      <input
                        className="input"
                        value={meal.name}
                        onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="w-28">
                      <label className="label">Horário</label>
                      <input
                        className="input font-mono-num"
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
                  </div>
                  <MealKcalLimitBar currentKcal={tot.kcal} limit={meal.kcalLimit} />
                  {meal.items.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum alimento nesta refeição.</p>
                  ) : (
                    <ul className="divide-y divide-[var(--line)]">
                      {meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2"
                        >
                          <div>
                            <p className="font-medium">{item.foodName}</p>
                            <p className="font-mono-num text-xs text-slate-500">
                              {Math.round((item.per100.kcal * item.grams) / 100)} kcal
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              className="input w-20 font-mono-num !py-1.5"
                              defaultValue={item.grams}
                              onBlur={(e) =>
                                updateItemGrams(meal.id, item.id, e.target.value)
                              }
                              aria-label="Gramas"
                            />
                            <span className="text-xs text-slate-500">g</span>
                            <button
                              type="button"
                              className="text-sm text-red-600 underline"
                              onClick={() => removeItem(meal.id, item.id)}
                            >
                              Remover
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
