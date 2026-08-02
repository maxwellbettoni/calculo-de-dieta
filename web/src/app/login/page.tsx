"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, setSession } from "@/lib/auth";
import { loginUser, registerUser } from "@/lib/backup";
import { ensureProfile } from "@/lib/db";
import { isGestorAuthEnabled, loginViaGestor } from "@/lib/gestor-auth";

type Mode = "gestor" | "local-login" | "local-register";

export default function LoginPage() {
  const router = useRouter();
  const gestorOn = isGestorAuthEnabled();
  const [mode, setMode] = useState<Mode>(gestorOn ? "gestor" : "local-login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "gestor") {
        await loginViaGestor(name, password);
      } else if (mode === "local-register") {
        const id = await registerUser(name, password);
        await ensureProfile(id);
        setSession(id);
      } else {
        const id = await loginUser(name, password);
        await ensureProfile(id);
        setSession(id);
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "gestor"
      ? "Entrar"
      : mode === "local-register"
        ? "Conta local"
        : "Entrar (local)";

  const subtitle =
    mode === "gestor"
      ? "Usuário e senha liberados pelo Gestor (após pagamento)"
      : mode === "local-register"
        ? "Só neste aparelho — sem sync na nuvem"
        : "Conta salva só neste aparelho";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(155deg, #0f766e 0%, #134e4a 45%, #0c1f1c 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(204,251,241,0.4) 0%, transparent 42%), radial-gradient(circle at 90% 80%, rgba(125,211,252,0.2) 0%, transparent 40%)",
        }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8">
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
            Para você
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Calculo de Dieta
          </h1>
          <p className="mt-4 max-w-md text-teal-100/90">
            Monte sua dieta, registre medidas e acompanhe a evolução — com acesso e
            pagamento gerenciados pelo Gestor.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/95 p-7 shadow-2xl backdrop-blur-md sm:p-9">
          <h2 className="font-display text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          {gestorOn && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  mode === "gestor"
                    ? "bg-[var(--teal)] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
                onClick={() => {
                  setMode("gestor");
                  setError("");
                }}
              >
                Acesso Gestor
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  mode !== "gestor"
                    ? "bg-[var(--teal)] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
                onClick={() => {
                  setMode("local-login");
                  setError("");
                }}
              >
                Conta local
              </button>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                {mode === "gestor" ? "Usuário" : "Nome"}
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "local-register" ? "new-password" : "current-password"}
                required
                minLength={mode === "gestor" ? 8 : 6}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? "Aguarde…" : mode === "local-register" ? "Criar conta local" : "Entrar"}
            </button>
          </form>

          {mode !== "gestor" && (
            <p className="mt-8 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
              {mode === "local-login" ? (
                <>
                  Criar conta só neste aparelho?{" "}
                  <button
                    type="button"
                    className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                    onClick={() => {
                      setMode("local-register");
                      setError("");
                    }}
                  >
                    Registrar
                  </button>
                </>
              ) : (
                <>
                  Já tem conta local?{" "}
                  <button
                    type="button"
                    className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                    onClick={() => {
                      setMode("local-login");
                      setError("");
                    }}
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
