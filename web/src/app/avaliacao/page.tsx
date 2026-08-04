"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { CircumferenceGuide, SkinfoldGuide } from "@/components/MeasurementGuides";
import { PageHeader } from "@/components/PageHeader";
import { ageFromBirthDate } from "@/lib/age";
import { getSessionId } from "@/lib/auth";
import { calcBmi, calcIcq, calcPollock3, calcPollock7 } from "@/lib/calc";
import {
  db,
  ensureProfile,
  getAssessmentsByUserId,
  type Assessment,
  type CircumferencesCm,
  type Profile,
  type SkinfoldsMm,
} from "@/lib/db";
import { parseOptNumber, todayISODate } from "@/lib/num";

type PollockChoice = "pollock7" | "pollock3" | "";

const CIRC_FIELDS: { key: keyof CircumferencesCm; label: string }[] = [
  { key: "pescoco", label: "Pescoço" },
  { key: "peitoral", label: "Peitoral" },
  { key: "cintura", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "quadril", label: "Quadril" },
  { key: "bracoRelaxado", label: "Braço relaxado" },
  { key: "bracoContraido", label: "Braço contraído" },
  { key: "antebraco", label: "Antebraço" },
  { key: "coxaProximal", label: "Coxa proximal" },
  { key: "coxaMedia", label: "Coxa média" },
  { key: "panturrilha", label: "Panturrilha" },
];

const FOLD_FIELDS: { key: keyof SkinfoldsMm; label: string }[] = [
  { key: "tricipital", label: "Tricipital" },
  { key: "subescapular", label: "Subescapular" },
  { key: "suprailiaca", label: "Suprailíaca" },
  { key: "abdominal", label: "Abdominal" },
  { key: "peitoral", label: "Peitoral" },
  { key: "axilarMedia", label: "Axilar média" },
  { key: "coxa", label: "Coxa" },
];

function emptyCirc(): CircumferencesCm {
  return {};
}
function emptyFolds(): SkinfoldsMm {
  return {};
}

export default function AvaliacaoPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [list, setList] = useState<Assessment[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [date, setDate] = useState(todayISODate());
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [circ, setCirc] = useState<CircumferencesCm>(emptyCirc());
  const [folds, setFolds] = useState<SkinfoldsMm>(emptyFolds());
  const [pollock, setPollock] = useState<PollockChoice>("pollock7");
  const [bioFat, setBioFat] = useState("");
  const [bioMuscle, setBioMuscle] = useState("");
  const [bioVisceral, setBioVisceral] = useState("");
  const [notes, setNotes] = useState("");
  const [activeCirc, setActiveCirc] = useState<string | null>(null);
  const [activeFold, setActiveFold] = useState<string | null>(null);

  async function reload() {
    const uid = getSessionId();
    if (uid == null) return;
    const p = await ensureProfile(uid);
    setProfile(p);
    const rows = await getAssessmentsByUserId(uid);
    setList(rows);
    if (!heightCm && rows[0]?.heightCm) {
      setHeightCm(String(rows[0].heightCm));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : 0;
  const sex =
    profile?.gender === "feminino" || profile?.gender === "masculino"
      ? profile.gender
      : null;

  const w = parseOptNumber(weightKg);
  const h = parseOptNumber(heightCm);
  const bmi = w != null && h != null ? calcBmi(w, h) : null;
  const icq =
    circ.cintura != null && circ.quadril != null
      ? calcIcq(circ.cintura, circ.quadril, profile?.gender || "")
      : null;

  const pollockResult = useMemo(() => {
    if (!sex || w == null || age <= 0) return null;
    if (pollock === "pollock7") return calcPollock7(folds, age, sex, w);
    if (pollock === "pollock3") return calcPollock3(folds, age, sex, w);
    return null;
  }, [sex, w, age, pollock, folds]);

  const bioFatN = parseOptNumber(bioFat);
  const bodyFatDisplay =
    bioFatN != null
      ? { pct: bioFatN, source: "bio" as const }
      : pollockResult
        ? { pct: pollockResult.bodyFatPct, source: pollockResult.protocol }
        : null;

  const fatMass =
    w != null && bodyFatDisplay
      ? Math.round(w * (bodyFatDisplay.pct / 100) * 10) / 10
      : null;
  const leanMass = w != null && fatMass != null ? Math.round((w - fatMass) * 10) / 10 : null;

  function resetForm() {
    setEditingId(null);
    setDate(todayISODate());
    setWeightKg("");
    setHeightCm(profile ? "" : "");
    setCirc(emptyCirc());
    setFolds(emptyFolds());
    setPollock("pollock7");
    setBioFat("");
    setBioMuscle("");
    setBioVisceral("");
    setNotes("");
    setErr("");
  }

  function loadAssessment(a: Assessment) {
    setEditingId(a.id ?? null);
    setDate(a.date);
    setWeightKg(String(a.weightKg));
    setHeightCm(String(a.heightCm));
    setCirc({ ...a.circumferences });
    setFolds({ ...a.skinfolds });
    setPollock((a.pollockProtocol as PollockChoice) || "pollock7");
    setBioFat(a.bio.bodyFatPct != null ? String(a.bio.bodyFatPct) : "");
    setBioMuscle(a.bio.muscleMassPct != null ? String(a.bio.muscleMassPct) : "");
    setBioVisceral(a.bio.visceralFat != null ? String(a.bio.visceralFat) : "");
    setNotes(a.notes || "");
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const uid = getSessionId();
    if (uid == null) return;

    if (!profile?.birthDate || !sex) {
      setErr("Preencha data de nascimento e sexo no perfil (necessário para Pollock/ICQ).");
      return;
    }
    if (w == null || h == null || w <= 0 || h <= 0) {
      setErr("Informe peso (kg) e altura (cm) válidos.");
      return;
    }

    const now = new Date().toISOString();
    const row: Assessment = {
      userId: uid,
      date,
      weightKg: w,
      heightCm: h,
      bmi: bmi?.bmi,
      bmiLabel: bmi?.label,
      circumferences: circ,
      icq: icq?.icq,
      icqLabel: icq?.label,
      skinfolds: folds,
      pollockProtocol: pollock,
      bodyFatPct: bodyFatDisplay?.pct,
      fatMassKg: fatMass ?? undefined,
      leanMassKg: leanMass ?? undefined,
      bodyFatSource: bodyFatDisplay?.source || "",
      bio: {
        bodyFatPct: bioFatN,
        muscleMassPct: parseOptNumber(bioMuscle),
        visceralFat: parseOptNumber(bioVisceral),
      },
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    if (editingId != null) {
      const prev = await db.assessments.get(editingId);
      await db.assessments.update(editingId, {
        ...row,
        createdAt: prev?.createdAt || now,
      });
      setMsg("Avaliação atualizada.");
    } else {
      await db.assessments.add(row);
      setMsg("Avaliação salva.");
    }
    await reload();
    resetForm();
    setTimeout(() => setMsg(""), 2500);
  }

  async function removeAssessment(id: number) {
    if (!confirm("Excluir esta avaliação?")) return;
    await db.assessments.delete(id);
    if (editingId === id) resetForm();
    await reload();
  }

  const profileOk = Boolean(profile?.birthDate && sex);

  return (
    <AuthGate>
      <div className="page">
        <PageHeader
          title="Avaliação"
          description="IMC (OMS), circunferências, ICQ, Pollock 3/7 e bioimpedância."
          actions={
            editingId != null ? (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Nova avaliação
              </button>
            ) : undefined
          }
        />

        {!profileOk && (
          <p className="card mt-4 text-sm text-[var(--warn)]">
            Complete nascimento e sexo em{" "}
            <Link href="/perfil" className="font-semibold underline">
              Meu perfil
            </Link>{" "}
            para cálculos de Pollock e ICQ por sexo.
            {profile?.birthDate ? ` Idade: ${age} anos.` : ""}
          </p>
        )}

        {msg && <p className="mt-3 text-sm text-[var(--ok)]">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <section className="card space-y-4">
            <h3 className="font-semibold">Peso, altura e IMC</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="date">
                  Data
                </label>
                <input
                  id="date"
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="weight">
                  Peso (kg)
                </label>
                <input
                  id="weight"
                  className="input font-mono-num"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="height">
                  Altura (cm)
                </label>
                <input
                  id="height"
                  className="input font-mono-num"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  required
                />
              </div>
            </div>
            {bmi && (
              <p className="rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm text-[var(--teal-deep)]">
                IMC{" "}
                <span className="font-mono-num font-semibold">{bmi.bmi}</span> —{" "}
                {bmi.label} <span className="text-xs opacity-80">(OMS)</span>
              </p>
            )}
          </section>

          <section className="card space-y-4">
            <h3 className="font-semibold">Circunferências (cm)</h3>
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <CircumferenceGuide activeKey={activeCirc} />
              <div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {CIRC_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="label" htmlFor={`c-${f.key}`}>
                        {f.label}
                      </label>
                      <input
                        id={`c-${f.key}`}
                        className="input font-mono-num"
                        inputMode="decimal"
                        value={circ[f.key] ?? ""}
                        onFocus={() => setActiveCirc(f.key)}
                        onChange={(e) => {
                          const n = parseOptNumber(e.target.value);
                          setCirc((prev) => {
                            const next = { ...prev };
                            if (n == null) delete next[f.key];
                            else next[f.key] = n;
                            return next;
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
                {icq && (
                  <p className="mt-4 rounded-lg bg-[var(--bg)] px-3 py-2 text-sm">
                    ICQ{" "}
                    <span className="font-mono-num font-semibold">{icq.icq}</span> —{" "}
                    {icq.label}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Dobras cutâneas (mm) — Pollock</h3>
              <select
                className="input w-auto"
                value={pollock}
                onChange={(e) => setPollock(e.target.value as PollockChoice)}
              >
                <option value="pollock7">Pollock 7 dobras</option>
                <option value="pollock3">Pollock 3 dobras</option>
                <option value="">Não calcular</option>
              </select>
            </div>
            <p className="text-xs muted">
              {pollock === "pollock3" && sex === "masculino" &&
                "Homem: peitoral + abdômen + coxa."}
              {pollock === "pollock3" && sex === "feminino" &&
                "Mulher: tríceps + suprailíaca + coxa."}
              {pollock === "pollock7" && "Sete dobras Jackson & Pollock + equação de Siri."}
            </p>
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <SkinfoldGuide activeKey={activeFold} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FOLD_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="label" htmlFor={`f-${f.key}`}>
                      {f.label}
                    </label>
                    <input
                      id={`f-${f.key}`}
                      className="input font-mono-num"
                      inputMode="decimal"
                      value={folds[f.key] ?? ""}
                      onFocus={() => setActiveFold(f.key)}
                      onChange={(e) => {
                        const n = parseOptNumber(e.target.value);
                        setFolds((prev) => {
                          const next = { ...prev };
                          if (n == null) delete next[f.key];
                          else next[f.key] = n;
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {pollockResult && (
              <p className="rounded-lg bg-[var(--teal-soft)] px-3 py-2 text-sm text-[var(--teal-deep)]">
                %BF <span className="font-mono-num font-semibold">{pollockResult.bodyFatPct}%</span>
                {" · "}MG{" "}
                <span className="font-mono-num">{pollockResult.fatMassKg} kg</span>
                {" · "}MM{" "}
                <span className="font-mono-num">{pollockResult.leanMassKg} kg</span>
                <span className="text-xs opacity-80"> (Siri · dens. {pollockResult.bodyDensity})</span>
              </p>
            )}
            {pollock && !pollockResult && w != null && sex && (
              <p className="text-xs text-[var(--warn)]">
                Preencha as dobras obrigatórias do protocolo para ver o cálculo.
              </p>
            )}
          </section>

          <section className="card space-y-4">
            <h3 className="font-semibold">Bioimpedância (inserção direta)</h3>
            <p className="text-xs muted">
              Se informar %BF da balança, ele tem prioridade sobre o Pollock no resumo salvo.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="bioFat">
                  % Gordura
                </label>
                <input
                  id="bioFat"
                  className="input font-mono-num"
                  inputMode="decimal"
                  value={bioFat}
                  onChange={(e) => setBioFat(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="bioMuscle">
                  % Massa muscular
                </label>
                <input
                  id="bioMuscle"
                  className="input font-mono-num"
                  inputMode="decimal"
                  value={bioMuscle}
                  onChange={(e) => setBioMuscle(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="bioVisceral">
                  Gordura visceral
                </label>
                <input
                  id="bioVisceral"
                  className="input font-mono-num"
                  inputMode="decimal"
                  value={bioVisceral}
                  onChange={(e) => setBioVisceral(e.target.value)}
                />
              </div>
            </div>
            {bodyFatDisplay && (
              <p className="text-sm muted">
                Resumo: %BF{" "}
                <span className="font-mono-num font-semibold">{bodyFatDisplay.pct}%</span>
                {fatMass != null && (
                  <>
                    {" "}
                    · MG <span className="font-mono-num">{fatMass} kg</span>
                  </>
                )}
                {leanMass != null && (
                  <>
                    {" "}
                    · MM <span className="font-mono-num">{leanMass} kg</span>
                  </>
                )}{" "}
                <span className="text-xs">
                  (fonte: {bodyFatDisplay.source === "bio" ? "bio" : bodyFatDisplay.source})
                </span>
              </p>
            )}
          </section>

          <section className="card space-y-3">
            <label className="label" htmlFor="notes">
              Observações
            </label>
            <textarea
              id="notes"
              className="input min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              {editingId != null ? "Atualizar avaliação" : "Salvar avaliação"}
            </button>
          </section>
        </form>

        <section className="card mt-8">
          <h3 className="font-semibold">Histórico</h3>
          {list.length === 0 ? (
            <p className="mt-3 text-sm muted">Nenhuma avaliação ainda.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {list.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {a.date} ·{" "}
                      <span className="font-mono-num">{a.weightKg} kg</span>
                      {a.bmi != null && (
                        <>
                          {" "}
                          · IMC <span className="font-mono-num">{a.bmi}</span>
                          {a.bmiLabel ? ` (${a.bmiLabel})` : ""}
                        </>
                      )}
                    </p>
                    <p className="text-xs muted">
                      {a.bodyFatPct != null && (
                        <>%BF {a.bodyFatPct}% ({a.bodyFatSource || "—"}) · </>
                      )}
                      {a.icq != null && <>ICQ {a.icq} · </>}
                      {a.notes ? a.notes.slice(0, 60) : "Sem notas"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost !py-1.5 !px-3 text-xs"
                      onClick={() => loadAssessment(a)}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !py-1.5 !px-3 text-xs text-red-600"
                      onClick={() => a.id != null && removeAssessment(a.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AuthGate>
  );
}
