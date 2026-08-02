export type MacroTargets = {
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  carbG: number;
  proteinG: number;
  fatG: number;
  ok: boolean;
};

export function macrosFromKcal(
  targetKcal: number,
  carbPct: number,
  proteinPct: number,
  fatPct: number
): MacroTargets {
  const sum = carbPct + proteinPct + fatPct;
  const ok = Math.abs(sum - 100) < 0.5;
  return {
    carbPct,
    proteinPct,
    fatPct,
    carbG: Math.round((targetKcal * (carbPct / 100)) / 4),
    proteinG: Math.round((targetKcal * (proteinPct / 100)) / 4),
    fatG: Math.round((targetKcal * (fatPct / 100)) / 9),
    ok,
  };
}

/** Atalhos de distribuição comum. */
export function macroPreset(
  kind: "equilibrado" | "lowcarb" | "hipertrofia" | "cutting"
): { carbPct: number; proteinPct: number; fatPct: number } {
  switch (kind) {
    case "lowcarb":
      return { carbPct: 30, proteinPct: 35, fatPct: 35 };
    case "hipertrofia":
      return { carbPct: 45, proteinPct: 30, fatPct: 25 };
    case "cutting":
      return { carbPct: 40, proteinPct: 35, fatPct: 25 };
    default:
      return { carbPct: 50, proteinPct: 25, fatPct: 25 };
  }
}
