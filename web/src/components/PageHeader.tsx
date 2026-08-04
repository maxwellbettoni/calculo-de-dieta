import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  greeting,
  actions,
}: {
  title: string;
  description?: string;
  greeting?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={
        actions
          ? "flex flex-wrap items-start justify-between gap-3"
          : undefined
      }
    >
      <div className="min-w-0">
        {greeting ? <p className="muted text-sm">{greeting}</p> : null}
        <h2
          className={`font-display text-3xl font-bold tracking-tight text-[var(--ink)] ${
            greeting ? "mt-1" : ""
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p className="muted mt-1 max-w-xl text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
