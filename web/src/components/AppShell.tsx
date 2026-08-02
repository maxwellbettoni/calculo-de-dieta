"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Início" },
  { href: "/perfil", label: "Perfil" },
  { href: "/avaliacao", label: "Avaliação" },
  { href: "/refeicoes", label: "Refeições" },
  { href: "/meu-plano", label: "Meu plano" },
  { href: "/receitas", label: "Receitas" },
  { href: "/alimentos", label: "Alimentos" },
  { href: "/atividade", label: "Atividade" },
  { href: "/evolucao", label: "Evolução" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/ajuda", label: "Ajuda" },
  { href: "/conta", label: "Conta" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] md:flex">
      <aside className="print:hidden border-b border-[var(--line)] bg-white md:w-60 md:border-b-0 md:border-r md:min-h-screen">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--teal)]">
            Seu acompanhamento
          </p>
          <h1 className="font-display text-xl font-bold tracking-tight">
            Calculo de Dieta
          </h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const mealsActive =
              item.href === "/refeicoes" &&
              (pathname === "/refeicoes" || pathname === "/meu-plano");
            const active =
              mealsActive ||
              (item.href !== "/refeicoes" &&
                (pathname === item.href || pathname.startsWith(`${item.href}/`)));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  item.href === "/refeicoes" && !active
                    ? "font-semibold text-[var(--teal)] hover:bg-[var(--teal-soft)]"
                    : active
                      ? "bg-[var(--teal-soft)] text-[var(--teal)] font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-3 pb-4 md:block">
          <button
            type="button"
            className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 md:px-8 print:px-0 print:py-0">{children}</main>
    </div>
  );
}
