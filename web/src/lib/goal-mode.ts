export type GoalMode = "perder" | "manter" | "ganhar";

export const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  perder: "Perder peso",
  manter: "Manter peso",
  ganhar: "Ganhar massa",
};

/** Ajuste típico sobre o GET (kcal/dia). */
export const GOAL_MODE_DELTA: Record<GoalMode, number> = {
  perder: -500,
  manter: 0,
  ganhar: 300,
};

export function targetFromGet(get: number, mode: GoalMode): number {
  return Math.max(1200, Math.round(get + GOAL_MODE_DELTA[mode]));
}
