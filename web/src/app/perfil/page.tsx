"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { ageFromBirthDate } from "@/lib/age";
import { getSessionId } from "@/lib/auth";
import {
  db,
  ensureProfile,
  getAnamnesisByUserId,
  type Anamnesis,
  type Profile,
} from "@/lib/db";

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const uid = getSessionId();
    if (uid == null) return;
    (async () => {
      setProfile(await ensureProfile(uid));
      setAnamnesis((await getAnamnesisByUserId(uid)) || null);
    })();
  }, []);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = getSessionId();
    if (uid == null || !profile?.id) return;
    const fd = new FormData(e.currentTarget);
    const patch: Partial<Profile> = {
      birthDate: String(fd.get("birthDate") || ""),
      gender: String(fd.get("gender") || "") as Profile["gender"],
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      goal: String(fd.get("goal") || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    await db.profiles.update(profile.id, patch);
    setProfile({ ...profile, ...patch });
    flash("Perfil salvo.");
  }

  async function saveAnamnesis(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = getSessionId();
    if (uid == null) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      userId: uid,
      medicalHistory: String(fd.get("medicalHistory") || ""),
      allergies: String(fd.get("allergies") || ""),
      intolerances: String(fd.get("intolerances") || ""),
      aversions: String(fd.get("aversions") || ""),
      bowel: String(fd.get("bowel") || ""),
      sleep: String(fd.get("sleep") || ""),
      activityLevel: String(fd.get("activityLevel") || ""),
      updatedAt: new Date().toISOString(),
    };
    if (anamnesis?.id) {
      await db.anamneses.update(anamnesis.id, payload);
      setAnamnesis({ ...anamnesis, ...payload });
    } else {
      const id = await db.anamneses.add(payload);
      setAnamnesis({ id, ...payload });
    }
    flash("Anamnese salva.");
  }

  const age = profile?.birthDate ? ageFromBirthDate(profile.birthDate) : null;

  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Meu perfil</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dados seus — usados nos cálculos e no acompanhamento.
        </p>
        {msg && <p className="mt-3 text-sm text-[var(--ok)]">{msg}</p>}

        {!profile ? (
          <p className="mt-6 text-slate-500">Carregando…</p>
        ) : (
          <>
            <form onSubmit={saveProfile} className="card mt-6 space-y-4">
              <h3 className="font-semibold">Dados básicos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="birthDate">
                    Data de nascimento
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    className="input"
                    defaultValue={profile.birthDate}
                  />
                  {age != null && (
                    <p className="mt-1 text-xs text-slate-500">{age} anos</p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="gender">
                    Sexo
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    className="input"
                    defaultValue={profile.gender}
                  >
                    <option value="">Selecione</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="goal">
                  Objetivo
                </label>
                <input
                  id="goal"
                  name="goal"
                  className="input"
                  defaultValue={profile.goal}
                  placeholder="Ex.: perder gordura, ganhar massa…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="email">
                    E-mail (opcional)
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="input"
                    defaultValue={profile.email}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="phone">
                    Telefone (opcional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="input"
                    defaultValue={profile.phone}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                Salvar perfil
              </button>
            </form>

            <form onSubmit={saveAnamnesis} className="card mt-6 space-y-4">
              <h3 className="font-semibold">Anamnese</h3>
              <div>
                <label className="label" htmlFor="medicalHistory">
                  Histórico / condições
                </label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  className="input min-h-20"
                  defaultValue={anamnesis?.medicalHistory || ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="allergies">
                    Alergias
                  </label>
                  <input
                    id="allergies"
                    name="allergies"
                    className="input"
                    defaultValue={anamnesis?.allergies || ""}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="intolerances">
                    Intolerâncias
                  </label>
                  <input
                    id="intolerances"
                    name="intolerances"
                    className="input"
                    defaultValue={anamnesis?.intolerances || ""}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="aversions">
                  Aversões alimentares
                </label>
                <input
                  id="aversions"
                  name="aversions"
                  className="input"
                  defaultValue={anamnesis?.aversions || ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="bowel">
                    Intestino
                  </label>
                  <input
                    id="bowel"
                    name="bowel"
                    className="input"
                    defaultValue={anamnesis?.bowel || ""}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="sleep">
                    Sono
                  </label>
                  <input
                    id="sleep"
                    name="sleep"
                    className="input"
                    defaultValue={anamnesis?.sleep || ""}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="activityLevel">
                  Nível de atividade
                </label>
                <input
                  id="activityLevel"
                  name="activityLevel"
                  className="input"
                  defaultValue={anamnesis?.activityLevel || ""}
                  placeholder="Ex.: sedentário, 3x academia…"
                />
              </div>
              <button type="submit" className="btn-primary">
                Salvar anamnese
              </button>
            </form>
          </>
        )}
      </div>
    </AuthGate>
  );
}
