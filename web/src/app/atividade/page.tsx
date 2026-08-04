"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getSessionId } from "@/lib/auth";
import { estimateExerciseKcal, EXERCISE_PRESETS } from "@/lib/exercise";
import { todayISODate } from "@/lib/num";
import {
  db,
  ensureActivityDay,
  ensureSettings,
  getDietPlanByUserId,
  uid,
  type ActivityDay,
  type UserSettings,
} from "@/lib/db";

export default function AtividadePage() {
  const [date, setDate] = useState(todayISODate());
  const [day, setDay] = useState<ActivityDay | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [weightKg, setWeightKg] = useState(70);
  const [steps, setSteps] = useState("");
  const [msg, setMsg] = useState("");
  const [importText, setImportText] = useState("");

  async function load(d = date) {
    const userId = getSessionId();
    if (userId == null) return;
    const s = await ensureSettings(userId);
    setSettings(s);
    const plan = await getDietPlanByUserId(userId);
    if (plan?.weightKg) setWeightKg(plan.weightKg);
    const a = await ensureActivityDay(userId, d);
    setDay(a);
    setSteps(a.steps ? String(a.steps) : "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function persist(next: ActivityDay) {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    if (updated.id) await db.activityDays.update(updated.id, updated);
    else {
      const id = await db.activityDays.add(updated);
      updated.id = id;
    }
    setDay(updated);
  }

  async function saveSteps(e: FormEvent) {
    e.preventDefault();
    if (!day) return;
    const n = Math.max(0, Math.round(Number(String(steps).replace(",", ".")) || 0));
    await persist({ ...day, steps: n, stepsSource: "manual" });
    setMsg("Passos salvos.");
    setTimeout(() => setMsg(""), 2000);
  }

  async function importSteps(e: FormEvent) {
    e.preventDefault();
    if (!day) return;
    // aceita número puro ou JSON {"steps":12345} ou linhas date,steps
    let n = 0;
    const raw = importText.trim();
    try {
      if (raw.startsWith("{")) {
        const j = JSON.parse(raw) as { steps?: number };
        n = Number(j.steps) || 0;
      } else if (raw.includes(",")) {
        const line = raw.split("\n").find((l) => l.startsWith(date)) || raw.split("\n")[0];
        const parts = line.split(/[,;\t]/);
        n = Number(parts[parts.length - 1]) || 0;
      } else {
        n = Number(raw.replace(/\D/g, "")) || 0;
      }
    } catch {
      setMsg("Não foi possível ler o arquivo/texto.");
      return;
    }
    await persist({ ...day, steps: Math.max(0, Math.round(n)), stepsSource: "import" });
    setImportText("");
    setSteps(String(Math.round(n)));
    setMsg("Passos importados (manual/arquivo).");
    setTimeout(() => setMsg(""), 2500);
  }

  async function addExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!day) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const minutes = Number(fd.get("minutes")) || 0;
    const preset = EXERCISE_PRESETS.find((p) => p.name === name);
    const met = preset?.met || Number(fd.get("met")) || 5;
    if (!name || minutes <= 0) return;
    const kcal = estimateExerciseKcal(met, weightKg, minutes);
    await persist({
      ...day,
      exercises: [...day.exercises, { id: uid(), name, minutes, kcal }],
    });
    e.currentTarget.reset();
    setMsg("Exercício registrado.");
    setTimeout(() => setMsg(""), 2000);
  }

  async function removeExercise(id: string) {
    if (!day) return;
    await persist({ ...day, exercises: day.exercises.filter((x) => x.id !== id) });
  }

  const goal = settings?.stepsGoal || 8000;
  const stepsN = day?.steps || 0;
  const stepsPct = Math.min(100, Math.round((stepsN / goal) * 100));
  const exerciseKcal = day?.exercises.reduce((s, x) => s + x.kcal, 0) || 0;

  return (
    <AuthGate>
      <div className="page">
        <PageHeader
          title="Atividade"
          description="Passos e exercícios do dia. Conexão direta com Apple Health / Google Fit não está disponível no navegador — use registro manual ou importação."
        />
        {msg && <p className="mt-2 text-sm text-[var(--ok)]">{msg}</p>}

        <div className="card mt-6">
          <label className="label" htmlFor="date">
            Data
          </label>
          <input
            id="date"
            type="date"
            className="input max-w-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <section className="card mt-4 space-y-4">
          <h3 className="font-semibold">Passos</h3>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]/50">
            <div
              className="h-full rounded-full bg-[var(--teal)]"
              style={{ width: `${stepsPct}%` }}
            />
          </div>
          <p className="font-mono-num text-sm">
            {stepsN} / {goal} passos ({stepsPct}%)
            {day?.stepsSource === "import" && (
              <span className="muted ml-2 text-xs">importado</span>
            )}
          </p>
          <form onSubmit={saveSteps} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="label">Registrar passos</label>
              <input
                className="input font-mono-num"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </form>
        </section>

        <section className="card mt-4 space-y-3">
          <h3 className="font-semibold">Importar de outro app</h3>
          <p className="text-xs muted">
            Cole um número, um JSON{" "}
            <code className="text-[var(--teal)]">{`{"steps":8500}`}</code> ou CSV{" "}
            <code className="text-[var(--teal)]">data,passos</code> exportado do seu app de
            saúde.
          </p>
          <form onSubmit={importSteps} className="space-y-3">
            <textarea
              className="input min-h-24 font-mono-num text-sm"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='8500  ou  {"steps":8500}'
            />
            <button type="submit" className="btn-ghost">
              Importar passos
            </button>
          </form>
        </section>

        <section className="card mt-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-semibold">Exercícios</h3>
            <p className="font-mono-num text-sm text-[var(--teal)]">
              ~{exerciseKcal} kcal gastas
            </p>
          </div>
          <form onSubmit={addExercise} className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Atividade</label>
              <select name="name" className="input" defaultValue={EXERCISE_PRESETS[0].name}>
                {EXERCISE_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Minutos</label>
              <input name="minutes" className="input font-mono-num" defaultValue={30} required />
            </div>
            <button type="submit" className="btn-primary sm:col-span-3">
              Adicionar exercício
            </button>
          </form>
          {day && day.exercises.length === 0 ? (
            <p className="text-sm muted">Nenhum exercício hoje.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] text-sm">
              {day?.exercises.map((x) => (
                <li key={x.id} className="flex justify-between gap-2 py-2">
                  <span>
                    {x.name} · {x.minutes} min ·{" "}
                    <span className="font-mono-num">{x.kcal} kcal</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => removeExercise(x.id)}
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AuthGate>
  );
}
