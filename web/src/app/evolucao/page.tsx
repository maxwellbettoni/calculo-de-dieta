"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { getSessionId } from "@/lib/auth";
import { getAssessmentsByUserId, type Assessment } from "@/lib/db";

export default function EvolucaoPage() {
  const [list, setList] = useState<Assessment[]>([]);

  useEffect(() => {
    const uid = getSessionId();
    if (uid == null) return;
    getAssessmentsByUserId(uid).then((rows) => {
      setList([...rows].sort((a, b) => a.date.localeCompare(b.date)));
    });
  }, []);

  const chart = useMemo(
    () =>
      list.map((a) => ({
        date: a.date.slice(5),
        full: a.date,
        peso: a.weightKg,
        bf: a.bodyFatPct ?? null,
        mm: a.leanMassKg ?? null,
        cintura: a.circumferences.cintura ?? null,
        quadril: a.circumferences.quadril ?? null,
      })),
    [list]
  );

  const last = list[list.length - 1];
  const prev = list[list.length - 2];

  function delta(a?: number | null, b?: number | null) {
    if (a == null || b == null) return "—";
    const d = Math.round((a - b) * 10) / 10;
    return `${d > 0 ? "+" : ""}${d}`;
  }

  return (
    <AuthGate>
      <div className="page-wide">
        <PageHeader
          title="Evolução"
          description="Gráficos a partir das suas avaliações salvas."
        />

        {list.length < 1 ? (
          <div className="card muted mt-6 text-sm">
            Ainda não há avaliações.{" "}
            <Link href="/avaliacao" className="font-semibold text-[var(--teal)] underline">
              Registrar a primeira
            </Link>
            .
          </div>
        ) : (
          <>
            {prev && last && (
              <div className="card mt-6 grid gap-3 text-sm sm:grid-cols-4">
                <p>
                  Δ Peso{" "}
                  <span className="font-mono-num font-semibold">
                    {delta(last.weightKg, prev.weightKg)} kg
                  </span>
                </p>
                <p>
                  Δ %BF{" "}
                  <span className="font-mono-num font-semibold">
                    {delta(last.bodyFatPct, prev.bodyFatPct)}
                  </span>
                </p>
                <p>
                  Δ MM{" "}
                  <span className="font-mono-num font-semibold">
                    {delta(last.leanMassKg, prev.leanMassKg)} kg
                  </span>
                </p>
                <p>
                  Δ Cintura{" "}
                  <span className="font-mono-num font-semibold">
                    {delta(last.circumferences.cintura, prev.circumferences.cintura)} cm
                  </span>
                </p>
              </div>
            )}

            <section className="card mt-6">
              <h3 className="font-semibold">Peso (kg)</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4df" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="peso" stroke="#7ac143" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card mt-6">
              <h3 className="font-semibold">% Gordura vs Massa magra (kg)</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4df" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="bf" name="%BF" stroke="#b45309" strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="mm" name="MM kg" stroke="#15803d" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card mt-6">
              <h3 className="font-semibold">Cintura / Quadril (cm)</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4df" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cintura" name="Cintura" stroke="#7ac143" strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="quadril" name="Quadril" stroke="#334155" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </AuthGate>
  );
}
