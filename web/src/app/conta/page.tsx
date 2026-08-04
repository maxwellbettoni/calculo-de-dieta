"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getSessionId, hashPassword } from "@/lib/auth";
import { exportUserBackup, importUserBackup } from "@/lib/backup";
import { db, ensureSettings, type BackupPayload, type UserSettings } from "@/lib/db";
import { ensureNotifyPermission } from "@/lib/reminders";

export default function ContaPage() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const uid = getSessionId();
    if (uid == null) return;
    db.users.get(uid).then((u) => setName(u?.name || ""));
    ensureSettings(uid).then(setSettings);
  }, []);

  function flash(text: string) {
    setMsg(text);
    setErr("");
    setTimeout(() => setMsg(""), 3000);
  }

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = getSessionId();
    if (uid == null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Informe um nome.");
      return;
    }
    await db.users.update(uid, { name: trimmed });
    flash("Nome atualizado.");
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = getSessionId();
    if (uid == null) return;
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current") || "");
    const next = String(fd.get("next") || "");
    const confirm = String(fd.get("confirm") || "");
    if (next.length < 6) {
      setErr("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      setErr("A confirmação não confere.");
      return;
    }
    const user = await db.users.get(uid);
    if (!user) return;
    const curHash = await hashPassword(current);
    if (user.passwordHash !== curHash) {
      setErr("Senha atual incorreta.");
      return;
    }
    await db.users.update(uid, { passwordHash: await hashPassword(next) });
    e.currentTarget.reset();
    flash("Senha alterada.");
  }

  async function onExport() {
    const uid = getSessionId();
    if (uid == null) return;
    try {
      const payload = await exportUserBackup(uid);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calculo-de-dieta-backup-${payload.user.name.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Backup baixado.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao exportar.");
    }
  }

  async function onImportFile(file: File) {
    const uid = getSessionId();
    if (uid == null) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      await importUserBackup(payload, uid);
      const user = await db.users.get(uid);
      setName(user?.name || "");
      flash("Backup importado. Perfil e anamnese atualizados.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  }

  return (
    <AuthGate>
      <div className="page-narrow">
        <PageHeader
          title="Conta"
          description="Nome, senha e backup para levar seus dados a outro aparelho."
        />
        {msg && <p className="mt-3 text-sm text-[var(--ok)]">{msg}</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <form onSubmit={saveName} className="card mt-6 space-y-4">
          <h3 className="font-semibold">Nome de exibição</h3>
          <div>
            <label className="label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Salvar nome
          </button>
        </form>

        <form onSubmit={changePassword} className="card mt-6 space-y-4">
          <h3 className="font-semibold">Trocar senha</h3>
          <div>
            <label className="label" htmlFor="current">
              Senha atual
            </label>
            <input id="current" name="current" type="password" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="next">
              Nova senha
            </label>
            <input id="next" name="next" type="password" className="input" required minLength={6} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              Confirmar nova senha
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              className="input"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary">
            Atualizar senha
          </button>
        </form>

        <section className="card mt-6 space-y-4">
          <h3 className="font-semibold">Lembretes</h3>
          <p className="text-sm muted">
            Avisa na hora da refeição (pelo horário do plano) e para beber água. O app
            precisa estar aberto ou em segundo plano no navegador.
          </p>
          {settings && (
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.remindersEnabled}
                  onChange={async (e) => {
                    const uid = getSessionId();
                    if (uid == null || !settings.id) return;
                    if (e.target.checked) {
                      const ok = await ensureNotifyPermission();
                      if (!ok) {
                        setErr("Permissão de notificação negada pelo navegador.");
                        return;
                      }
                    }
                    const patch = {
                      remindersEnabled: e.target.checked,
                      updatedAt: new Date().toISOString(),
                    };
                    await db.settings.update(settings.id, patch);
                    setSettings({ ...settings, ...patch });
                    flash(e.target.checked ? "Lembretes ativados." : "Lembretes desligados.");
                  }}
                />
                Ativar lembretes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.mealReminders}
                  disabled={!settings.remindersEnabled}
                  onChange={async (e) => {
                    if (!settings.id) return;
                    const patch = {
                      mealReminders: e.target.checked,
                      updatedAt: new Date().toISOString(),
                    };
                    await db.settings.update(settings.id, patch);
                    setSettings({ ...settings, ...patch });
                  }}
                />
                Hora de comer (refeições do plano)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.waterReminders}
                  disabled={!settings.remindersEnabled}
                  onChange={async (e) => {
                    if (!settings.id) return;
                    const patch = {
                      waterReminders: e.target.checked,
                      updatedAt: new Date().toISOString(),
                    };
                    await db.settings.update(settings.id, patch);
                    setSettings({ ...settings, ...patch });
                  }}
                />
                Hora de beber água
              </label>
              <div>
                <label className="label" htmlFor="waterInterval">
                  Intervalo água (minutos)
                </label>
                <input
                  id="waterInterval"
                  type="number"
                  className="input font-mono-num max-w-[140px]"
                  value={settings.waterIntervalMin}
                  disabled={!settings.remindersEnabled}
                  onChange={async (e) => {
                    if (!settings.id) return;
                    const waterIntervalMin = Math.max(30, Number(e.target.value) || 120);
                    const patch = { waterIntervalMin, updatedAt: new Date().toISOString() };
                    await db.settings.update(settings.id, patch);
                    setSettings({ ...settings, ...patch });
                  }}
                />
              </div>
              <div>
                <label className="label" htmlFor="stepsGoal">
                  Meta diária de passos
                </label>
                <input
                  id="stepsGoal"
                  type="number"
                  className="input font-mono-num max-w-[140px]"
                  value={settings.stepsGoal}
                  onChange={async (e) => {
                    if (!settings.id) return;
                    const stepsGoal = Math.max(1000, Number(e.target.value) || 8000);
                    const patch = { stepsGoal, updatedAt: new Date().toISOString() };
                    await db.settings.update(settings.id, patch);
                    setSettings({ ...settings, ...patch });
                  }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="card mt-6 space-y-4">
          <h3 className="font-semibold">Backup</h3>
          <p className="text-sm muted">
            Exporte um JSON e importe em outro navegador para continuar o acompanhamento.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={onExport}>
              Exportar JSON
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fileRef.current?.click()}
            >
              Importar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>
    </AuthGate>
  );
}
