import { buildMoneyReport, type MoneyReport, type MoneyTransaction } from "@/lib/moneymirror"

const keys = {
  transactions: "moneymirror:transactions",
  report: "moneymirror:report",
}

export function loadTransactions() {
  return readJson<MoneyTransaction[]>(keys.transactions, [])
}

export function saveTransactions(transactions: MoneyTransaction[]) {
  writeJson(keys.transactions, transactions)
  writeJson(keys.report, buildMoneyReport(transactions))
}

export function loadReport() {
  return readJson<MoneyReport | null>(keys.report, null)
}

export function saveReport(report: MoneyReport) {
  writeJson(keys.report, report)
}

export function clearMoneyMirrorData() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(keys.transactions)
  window.localStorage.removeItem(keys.report)
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}
