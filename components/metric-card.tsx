import { type ElementType } from "react"

export function MetricCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  detail?: string
  tone?: "green" | "gold" | "dark"
  icon?: ElementType
}) {
  const toneClass =
    tone === "green"
      ? "bg-primary text-primary-foreground"
      : tone === "gold"
        ? "bg-accent text-accent-foreground"
        : tone === "dark"
          ? "bg-expense text-expense-foreground"
          : "bg-card"

  return (
    <div className={`rounded-lg border border-border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest opacity-75">{label}</p>
        {Icon ? <Icon className="size-4 opacity-60" /> : null}
      </div>
      <p className="mt-3 break-words font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {detail ? <p className="mt-2 font-mono text-sm tabular-nums opacity-75">{detail}</p> : null}
    </div>
  )
}
