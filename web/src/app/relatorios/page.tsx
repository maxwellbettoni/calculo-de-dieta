"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getSessionId } from "@/lib/auth";
import { dayTotals, ensureDietPlan, mealTotals, planMacroTargets } from "@/lib/diet";
import {
  db,
  ensureProfile,
  getAssessmentsByUserId,
  getAnamnesisByUserId,
  type Anamnesis,
  type Assessment,
  type DietPlan,
  type Profile,
} from "@/lib/db";

type Kind = "prontuario" | "plano" | "avaliacao";

export default function RelatoriosPage() {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [anam, setAnam] = useState<Anamnesis | null>(null);
  const [last, setLast] = useState<Assessment | null>(null);
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [kind, setKind] = useState<Kind>("plano");

  useEffect(() => {
    const uid = getSessionId();
    if (uid == null) return;
    (async () => {
      const u = await db.users.get(uid);
      setName(u?.name || "");
      setProfile(await ensureProfile(uid));
      setAnam((await getAnamnesisByUserId(uid)) || null);
      const a = await getAssessmentsByUserId(uid);
      setLast(a[0] || null);
      setPlan(await ensureDietPlan(uid));
    })();
  }, []);

  function printReport() {
    window.print();
  }

  const macros = plan ? planMacroTargets(plan) : null;
  const day = plan ? dayTotals(plan.meals) : null;

  return (
    <AuthGate>
      <div className="page">
        <div className="print:hidden">
          <PageHeader
            title="Relatórios"
            description="Gere PDF pelo diálogo de impressão do navegador (Salvar como PDF / WhatsApp)."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["plano", "Plano alimentar"],
                ["avaliacao", "Avaliação física"],
                ["prontuario", "Prontuário / metas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={kind === id ? "btn-primary !py-2" : "btn-ghost !py-2"}
                onClick={() => setKind(id)}
              >
                {label}
              </button>
            ))}
            <button type="button" className="btn-primary !py-2" onClick={printReport}>
              Imprimir / PDF
            </button>
          </div>
        </div>

        <article className="card mt-6 print:mt-0 print:border-0 print:shadow-none print:p-0">
          <header className="border-b border-[var(--line)] pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)]">
              Calculo de Dieta
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold">
              {kind === "plano" && "Plano alimentar"}
              {kind === "avaliacao" && "Avaliação física"}
              {kind === "prontuario" && "Prontuário e metas"}
            </h3>
            <p className="mt-1 text-sm muted">
              {name}
              {profile?.goal ? ` · ${profile.goal}` : ""}
            </p>
            <p className="text-xs muted">
              Emitido em {new Date().toLocaleString("pt-BR")}
            </p>
          </header>

          {kind === "avaliacao" && (
            <div className="mt-4 space-y-2 text-sm">
              {!last ? (
                <p className="muted">Nenhuma avaliação salva.</p>
              ) : (
                <>
                  <p>
                    Data: <strong>{last.date}</strong>
                  </p>
                  <p>
                    Peso: <strong className="font-mono-num">{last.weightKg} kg</strong> · Altura:{" "}
                    <strong className="font-mono-num">{last.heightCm} cm</strong>
                  </p>
                  <p>
                    IMC:{" "}
                    <strong className="font-mono-num">
                      {last.bmi} ({last.bmiLabel})
                    </strong>
                  </p>
                  {last.icq != null && (
                    <p>
                      ICQ:{" "}
                      <strong className="font-mono-num">
                        {last.icq} ({last.icqLabel})
                      </strong>
                    </p>
                  )}
                  {last.bodyFatPct != null && (
                    <p>
                      %BF: <strong className="font-mono-num">{last.bodyFatPct}%</strong> (
                      {last.bodyFatSource}) · MG {last.fatMassKg} kg · MM {last.leanMassKg} kg
                    </p>
                  )}
                  <p className="pt-2 font-semibold">Circunferências (cm)</p>
                  <ul className="grid grid-cols-2 gap-1 font-mono-num text-xs sm:grid-cols-3">
                    {Object.entries(last.circumferences).map(([k, v]) =>
                      v != null ? (
                        <li key={k}>
                          {k}: {v}
                        </li>
                      ) : null
                    )}
                  </ul>
                  {last.notes && <p className="pt-2">Obs.: {last.notes}</p>}
                </>
              )}
            </div>
          )}

          {kind === "plano" && plan && (
            <div className="mt-4 space-y-4 text-sm">
              <p>
                Meta: <strong className="font-mono-num">{plan.targetKcal} kcal</strong> · GET{" "}
                <strong className="font-mono-num">{plan.get}</strong> ({plan.equation} ·{" "}
                {plan.activity})
              </p>
              {macros && (
                <p>
                  Macros: Proteína {macros.proteinPct}% ({macros.proteinG} g) · Carboidrato{" "}
                  {macros.carbPct}% ({macros.carbG} g) · Gordura {macros.fatPct}% ({macros.fatG}{" "}
                  g)
                </p>
              )}
              <p>
                Água: <strong className="font-mono-num">{plan.waterMl} ml</strong>/dia
              </p>
              {plan.meals.map((m) => {
                const t = mealTotals(m);
                return (
                  <div key={m.id} className="border-t border-[var(--line)] pt-3">
                    <p className="font-semibold">
                      {m.name} · {m.time}{" "}
                      <span className="font-normal muted">({t.kcal} kcal)</span>
                    </p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {m.items.map((i) => (
                        <li key={i.id}>
                          • {i.foodName} — {i.grams}g
                          {i.substitutions.length > 0 && (
                            <span className="muted">
                              {" "}
                              | subst:{" "}
                              {i.substitutions.map((s) => `${s.name} ${s.grams}g`).join(", ")}
                            </span>
                          )}
                        </li>
                      ))}
                      {m.items.length === 0 && <li className="muted">Sem itens</li>}
                    </ul>
                  </div>
                );
              })}
              {day && (
                <p className="border-t border-[var(--line)] pt-3 font-mono-num">
                  Total dia: {day.kcal} kcal · Proteína {day.protein}g · Carboidrato{" "}
                  {day.carbs}g · Gordura {day.fat}g
                </p>
              )}
              {plan.supplements.length > 0 && (
                <div>
                  <p className="font-semibold">Suplementos</p>
                  <ul className="mt-1 text-xs">
                    {plan.supplements.map((s) => (
                      <li key={s.id}>
                        • {s.name} — {s.dose} · {s.time} · {s.form}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {kind === "prontuario" && (
            <div className="mt-4 space-y-3 text-sm">
              <p>
                Nascimento: {profile?.birthDate || "—"} · Sexo: {profile?.gender || "—"}
              </p>
              <p>Objetivo: {profile?.goal || "—"}</p>
              <p>Contato: {profile?.email || "—"} · {profile?.phone || "—"}</p>
              <div className="border-t border-[var(--line)] pt-3">
                <p className="font-semibold">Anamnese</p>
                <p className="mt-1 text-xs whitespace-pre-wrap">
                  Histórico: {anam?.medicalHistory || "—"}
                  {"\n"}Alergias: {anam?.allergies || "—"}
                  {"\n"}Intolerâncias: {anam?.intolerances || "—"}
                  {"\n"}Aversões: {anam?.aversions || "—"}
                  {"\n"}Intestino: {anam?.bowel || "—"}
                  {"\n"}Sono: {anam?.sleep || "—"}
                  {"\n"}Atividade: {anam?.activityLevel || "—"}
                </p>
              </div>
              {plan && (
                <div className="border-t border-[var(--line)] pt-3">
                  <p className="font-semibold">Cartão de metas</p>
                  <p className="mt-1 font-mono-num">
                    {plan.targetKcal} kcal · água {plan.waterMl} ml · C/P/G{" "}
                    {plan.carbPct}/{plan.proteinPct}/{plan.fatPct}%
                  </p>
                </div>
              )}
            </div>
          )}

          <footer className="mt-8 border-t border-[var(--line)] pt-3 text-xs muted">
            Documento pessoal — Calculo de Dieta. Não substitui orientação profissional de saúde.
          </footer>
        </article>
      </div>
    </AuthGate>
  );
}
