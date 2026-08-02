import { mealKcalLimitStatus } from "@/lib/diet";

export function MealKcalLimitBar({
  currentKcal,
  limit,
}: {
  currentKcal: number;
  limit?: number;
}) {
  const st = mealKcalLimitStatus(currentKcal, limit);
  if (!limit || limit <= 0) {
    return <p className="text-xs text-slate-400">Sem limite de kcal</p>;
  }
  const width = Math.min(100, st.pct);
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className={st.over ? "font-semibold text-[#9a3412]" : "text-slate-600"}>
          {st.label}
        </span>
        <span className="text-slate-400">{st.pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            st.over ? "bg-[#b45309]" : st.pct >= 90 ? "bg-amber-400" : "bg-[var(--teal)]"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      {st.over && (
        <p className="mt-1 text-xs font-medium text-[#9a3412]">Acima do limite desta refeição</p>
      )}
    </div>
  );
}
