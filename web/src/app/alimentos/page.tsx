"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { db, ensureFoodsSeeded, type Food } from "@/lib/db";

const PAGE_SIZE = 50;

export default function AlimentosPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      await ensureFoodsSeeded();
      setFoods(await db.foods.orderBy("name").toArray());
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(foods.map((f) => f.category));
    return ["todos", ...Array.from(set).sort()];
  }, [foods]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return foods.filter((f) => {
      if (cat !== "todos" && f.category !== cat) return false;
      if (!query) return true;
      return f.name.toLowerCase().includes(query);
    });
  }, [foods, q, cat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q, cat]);

  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Alimentos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tabela nutricional ({foods.length} itens) — valores por 100 g.
        </p>

        <div className="card mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="q">
              Buscar
            </label>
            <input
              id="q"
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: frango, arroz…"
            />
          </div>
          <div>
            <label className="label" htmlFor="cat">
              Categoria
            </label>
            <select id="cat" className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "todos" ? "Todas" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="card mt-4 text-sm text-slate-500">Nenhum alimento encontrado.</p>
        ) : (
          <div className="card mt-4 overflow-x-auto p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3 text-sm text-slate-600">
              <span>
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="min-w-[5.5rem] text-center text-xs text-slate-500">
                  Página {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Alimento</th>
                  <th className="px-2 py-3">kcal</th>
                  <th className="px-2 py-3">Prot. (g)</th>
                  <th className="px-2 py-3">Carb. (g)</th>
                  <th className="px-2 py-3">Gord. (g)</th>
                  <th className="px-2 py-3">Fibra (g)</th>
                  <th className="px-2 py-3">Sódio (mg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono-num">
                {pageItems.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2 font-sans font-medium">
                      {f.name}
                      <span className="ml-2 text-xs font-normal text-slate-400">{f.category}</span>
                    </td>
                    <td className="px-2 py-2">{f.kcal}</td>
                    <td className="px-2 py-2">{f.protein}</td>
                    <td className="px-2 py-2">{f.carbs}</td>
                    <td className="px-2 py-2">{f.fat}</td>
                    <td className="px-2 py-2">{f.fiber}</td>
                    <td className="px-2 py-2">{f.sodium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-3">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  Página {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
