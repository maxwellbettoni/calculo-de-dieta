/** Lê número de input; vazio → undefined. */
export function parseOptNumber(raw: string | FormDataEntryValue | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
