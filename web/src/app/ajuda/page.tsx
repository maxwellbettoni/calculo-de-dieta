"use client";

import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";

const SECTIONS: {
  title: string;
  href: string;
  body: string;
  bullets: string[];
}[] = [
  {
    title: "Início",
    href: "/dashboard",
    body: "Painel principal depois do login. Mostra se o perfil e a anamnese estão ok, o último peso e um resumo de como você está na dieta.",
    bullets: [
      "Status do plano (no alvo, abaixo, acima, cardápio vazio…)",
      "Meta de kcal vs o que está no cardápio",
      "Barras de proteína, carboidrato e gordura",
      "Próximo lembrete, passos do dia e variação de peso",
    ],
  },
  {
    title: "Perfil",
    href: "/perfil",
    body: "Seus dados pessoais usados nos cálculos (idade, sexo, objetivo) e a anamnese (histórico, alergias, sono, atividade).",
    bullets: [
      "Nascimento e sexo → necessários para IMC, ICQ, Pollock e GET",
      "Objetivo (ex.: perda) aparece no Início",
      "Alergias/intolerâncias geram aviso ao montar o cardápio",
    ],
  },
  {
    title: "Avaliação",
    href: "/avaliacao",
    body: "Registro da composição e medidas do corpo. Cada avaliação fica no histórico para comparar depois.",
    bullets: [
      "Peso + altura → IMC com classificação OMS",
      "Circunferências → ICQ (risco cintura/quadril) + desenho de onde medir",
      "Dobras cutâneas → Pollock 3 ou 7 (% gordura, massa gorda e magra)",
      "Bioimpedância → você digita %BF da balança (tem prioridade sobre o Pollock)",
    ],
  },
  {
    title: "Meu plano",
    href: "/meu-plano",
    body: "Centro da dieta: metas e o modelo de cardápio (base para cada dia).",
    bullets: [
      "Metas e GET: Harris-Benedict, Mifflin ou FAO/OMS × fator de atividade",
      "Objetivo: perder (−500 kcal), manter (0) ou ganhar (+300) em cima do GET",
      "Macros em gramas e % (presets equilibrado, lowcarb, hipertrofia, cutting)",
      "Modelo de refeições usado ao criar o cardápio do dia",
      "Água (ml/kg) e lista de suplementos",
    ],
  },
  {
    title: "Refeições",
    href: "/refeicoes",
    body: "Cardápio diário: um dia por vez, criável com um botão e editável sem mudar os outros dias.",
    bullets: [
      "Botão “Criar automaticamente” monta o dia perto da meta de kcal",
      "Se o modelo em Meu plano já tiver alimentos, ele usa essa base",
      "Pode alterar qualquer refeição só daquele dia",
    ],
  },
  {
    title: "Receitas",
    href: "/receitas",
    body: "Biblioteca de receitas saudáveis prontas (mais de 150) e espaço para salvar as suas.",
    bullets: [
      "Cada receita mostra kcal, proteína, carboidrato e gordura por porção",
      "Busca por nome, categoria ou ingrediente",
      "Você pode criar receitas novas; as prontas vêm do app",
    ],
  },
  {
    title: "Alimentos",
    href: "/alimentos",
    body: "Tabela nutricional ampla (cereais, carnes, frutas, pratos, etc.) com valores por 100 g.",
    bullets: [
      "Busca e filtro por categoria",
      "kcal, proteína, carboidrato, gordura, fibra e sódio",
      "Usada ao adicionar itens nas refeições do dia",
    ],
  },
  {
    title: "Atividade",
    href: "/atividade",
    body: "Passos e exercícios do dia. Não conecta direto ao Apple Health/Google Fit no navegador — registro manual ou importação.",
    bullets: [
      "Meta de passos (definida em Conta)",
      "Importar número/JSON/CSV de outro app",
      "Exercícios com estimativa de kcal (caminhada, musculação, etc.)",
    ],
  },
  {
    title: "Evolução",
    href: "/evolucao",
    body: "Gráficos ao longo do tempo com base nas avaliações salvas.",
    bullets: [
      "Peso",
      "% gordura e massa magra",
      "Cintura e quadril",
      "Diferença (Δ) entre a última e a anterior",
    ],
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    body: "Documentos para imprimir ou salvar em PDF (pelo navegador) e enviar, se quiser.",
    bullets: [
      "Plano alimentar (refeições, macros, água, suplementos)",
      "Avaliação física (IMC, ICQ, %BF, circunferências)",
      "Prontuário / metas (perfil + anamnese + cartão de metas)",
    ],
  },
  {
    title: "Conta",
    href: "/conta",
    body: "Login local, lembretes e backup dos seus dados neste aparelho.",
    bullets: [
      "Trocar nome e senha",
      "Lembretes: hora de comer (horários do plano) e beber água (precisa permitir notificação)",
      "Meta diária de passos",
      "Exportar / importar JSON para levar dados a outro navegador ou PC",
    ],
  },
];

export default function AjudaPage() {
  return (
    <AuthGate>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-bold tracking-tight">Ajuda</h2>
        <p className="mt-2 text-sm text-slate-600">
          Resumo do <strong>Calculo de Dieta</strong>: app de autoacompanhamento. Você
          monta a própria dieta, registra medidas e vê a evolução — sem nutricionista no
          meio. Os dados ficam no seu navegador (IndexedDB).
        </p>

        <section className="card mt-6 space-y-2 text-sm text-slate-700">
          <h3 className="font-semibold text-base">Fluxo sugerido</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Preencha o <Link className="text-[var(--teal)] underline" href="/perfil">Perfil</Link>{" "}
              (nascimento, sexo, objetivo e anamnese).
            </li>
            <li>
              Faça uma <Link className="text-[var(--teal)] underline" href="/avaliacao">Avaliação</Link>{" "}
              (pelo menos peso e altura).
            </li>
            <li>
              Em <Link className="text-[var(--teal)] underline" href="/meu-plano">Meu plano</Link>,
              escolha o objetivo (perder / manter / ganhar) e monte o cardápio.
            </li>
            <li>
              Use <Link className="text-[var(--teal)] underline" href="/receitas">Receitas</Link> e{" "}
              <Link className="text-[var(--teal)] underline" href="/alimentos">Alimentos</Link> para
              ideias e precisão.
            </li>
            <li>
              Acompanhe em{" "}
              <Link className="text-[var(--teal)] underline" href="/dashboard">Início</Link> e{" "}
              <Link className="text-[var(--teal)] underline" href="/evolucao">Evolução</Link>.
            </li>
          </ol>
        </section>

        <div className="mt-6 space-y-4">
          {SECTIONS.map((s) => (
            <article key={s.href} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-bold tracking-tight">{s.title}</h3>
                <Link href={s.href} className="text-sm font-semibold text-[var(--teal)] underline">
                  Abrir →
                </Link>
              </div>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="card mt-6 text-sm text-slate-600">
          <h3 className="font-semibold text-[var(--ink)]">Siglas rápidas</h3>
          <ul className="mt-2 space-y-1">
            <li>
              <strong>IMC</strong> — índice de massa corporal (peso ÷ altura²).
            </li>
            <li>
              <strong>ICQ</strong> — razão cintura ÷ quadril (risco cardiovascular).
            </li>
            <li>
              <strong>GET</strong> — gasto energético total do dia (TMB × atividade).
            </li>
            <li>
              <strong>TMB</strong> — taxa metabólica basal (energia em repouso).
            </li>
            <li>
              <strong>%BF</strong> — percentual de gordura corporal.
            </li>
            <li>
              <strong>Macros</strong> — proteína, carboidrato e gordura (em gramas ou %).
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            O app não substitui orientação médica ou nutricional profissional.
          </p>
        </section>
      </div>
    </AuthGate>
  );
}
