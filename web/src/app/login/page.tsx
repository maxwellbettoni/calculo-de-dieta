"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { loginViaGestor } from "@/lib/gestor-auth";

function LeafMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="20" cy="20" r="20" fill="var(--teal)" />
      <path
        d="M12 22c4-9 12-12 16-12-1 8-5 14-12 16-1-1-3-2-4-4z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M16 18c3 2 6 5 8 9"
        stroke="var(--teal-deep)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
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
      await loginViaGestor(name, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(122,193,67,0.18), transparent 55%), radial-gradient(circle at 90% 90%, rgba(232,245,216,0.9), transparent 40%), #f5f7f4",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LeafMark className="h-14 w-14" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
            Calculo de Dieta
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Monte sua dieta e acompanhe a evolução
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_12px_40px_rgba(26,46,28,0.08)] sm:p-8">
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">Entrar</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Use o usuário e a senha que você recebeu.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Usuário
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
                autoComplete="current-password"
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? "Aguarde…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
