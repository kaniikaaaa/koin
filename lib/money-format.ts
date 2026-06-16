export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(amount))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function toMonthKey(date: string) {
  if (/^\d{4}-\d{2}/.test(date)) return date.slice(0, 7)

  const parsed = new Date(date)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 7)
  }

  return "Unknown"
}

export function getMonthSortValue(month: string) {
  if (month === "Unknown") return Number.MAX_SAFE_INTEGER
  return Number(month.replace("-", ""))
}

export function formatMonthLabel(month: string) {
  if (month === "Unknown") return "Unknown"

  const [year, rawMonth] = month.split("-")
  const date = new Date(Number(year), Number(rawMonth) - 1, 1)
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date)
}
