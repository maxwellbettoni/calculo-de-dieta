"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { getSessionId } from "@/lib/auth";
import { db, ensureRecipesSeeded, type Recipe } from "@/lib/db";

export default function ReceitasPage() {
  const [list, setList] = useState<Recipe[]>([]);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const userId = getSessionId();
    if (userId == null) return;
    await ensureRecipesSeeded(userId);
    const rows = await db.recipes.where("userId").equals(userId).toArray();
    setList(rows.sort((a, b) => a.name.localeCompare(b.name)));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.ingredients.some((i) => i.toLowerCase().includes(query))
    );
  }, [list, q]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = getSessionId();
    if (userId == null) return;
    const fd = new FormData(e.currentTarget);
    const now = new Date().toISOString();
    const ingredients = String(fd.get("ingredients") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await db.recipes.add({
      userId,
      name: String(fd.get("name") || "").trim(),
      category: String(fd.get("category") || "Geral").trim(),
      servings: Number(fd.get("servings")) || 1,
      prepMinutes: Number(fd.get("prepMinutes")) || 15,
      kcal: Number(fd.get("kcal")) || 0,
      protein: Number(fd.get("protein")) || 0,
      carbs: Number(fd.get("carbs")) || 0,
      fat: Number(fd.get("fat")) || 0,
      ingredients,
      steps: String(fd.get("steps") || "").trim(),
      isSeed: false,
      createdAt: now,
      updatedAt: now,
    });
    e.currentTarget.reset();
    setMsg("Receita salva.");
    setTimeout(() => setMsg(""), 2000);
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta receita?")) return;
    await db.recipes.delete(id);
    await load();
  }

  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Receitas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Receitas saudáveis prontas + as que você guardar no dia a dia.
        </p>
        {msg && <p className="mt-2 text-sm text-[var(--ok)]">{msg}</p>}

        <div className="card mt-6">
          <label className="label" htmlFor="q">
            Buscar
          </label>
          <input
            id="q"
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, categoria ou ingrediente…"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="card text-sm text-slate-500">Nenhuma receita encontrada.</p>
          ) : (
            filtered.map((r) => (
              <article key={r.id} className="card">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setOpenId(openId === r.id ? null : r.id || null)}
                >
                  <div>
                    <p className="font-semibold">{r.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.category} · {r.prepMinutes} min · {r.servings} porção(ões)
                      {r.isSeed ? " · pronta" : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--teal)]">
                      <span className="font-mono-num font-semibold">{r.kcal} kcal</span>
                      <span className="mx-1.5 text-teal-600/40">·</span>
                      Proteína <span className="font-mono-num font-semibold">{r.protein} g</span>
                      <span className="mx-1.5 text-teal-600/40">·</span>
                      Carboidrato <span className="font-mono-num font-semibold">{r.carbs} g</span>
                      <span className="mx-1.5 text-teal-600/40">·</span>
                      Gordura <span className="font-mono-num font-semibold">{r.fat} g</span>
                      <span className="ml-1 text-slate-400">(por porção)</span>
                    </p>
                  </div>
                  <span className="text-slate-400">{openId === r.id ? "−" : "+"}</span>
                </button>
                {openId === r.id && (
                  <div className="mt-4 border-t border-[var(--line)] pt-4 text-sm">
                    <p className="font-medium">Ingredientes</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                      {r.ingredients.map((i) => (
                        <li key={`${r.id}-${i}`}>{i}</li>
                      ))}
                    </ul>
                    <p className="mt-3 font-medium">Modo de preparo</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">{r.steps}</p>
                    {!r.isSeed && r.id && (
                      <button
                        type="button"
                        className="btn-ghost mt-4 text-xs text-red-600"
                        onClick={() => remove(r.id!)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <form onSubmit={onCreate} className="card mt-8 space-y-3">
          <h3 className="font-semibold">Nova receita</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nome</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Categoria</label>
              <input name="category" className="input" placeholder="Almoço, Lanche…" defaultValue="Geral" />
            </div>
            <div>
              <label className="label">Tempo (min)</label>
              <input name="prepMinutes" className="input font-mono-num" defaultValue={20} />
            </div>
            <div>
              <label className="label">Porções</label>
              <input name="servings" className="input font-mono-num" defaultValue={1} />
            </div>
            <div>
              <label className="label">kcal / porção</label>
              <input name="kcal" className="input font-mono-num" defaultValue={0} />
            </div>
            <div>
              <label className="label">Proteína (g)</label>
              <input name="protein" className="input font-mono-num" defaultValue={0} />
            </div>
            <div>
              <label className="label">Carboidrato (g)</label>
              <input name="carbs" className="input font-mono-num" defaultValue={0} />
            </div>
            <div>
              <label className="label">Gordura (g)</label>
              <input name="fat" className="input font-mono-num" defaultValue={0} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Ingredientes (1 por linha)</label>
              <textarea name="ingredients" className="input min-h-24" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Modo de preparo</label>
              <textarea name="steps" className="input min-h-24" required />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Salvar receita
          </button>
        </form>
      </div>
    </AuthGate>
  );
}
