import {
  appendAnalysisToWorkspace,
  buildMoneyReport,
  createMoneyWorkspace,
  createWorkspaceFromTransactions,
  getWorkspaceTransactions,
  migrateMoneyWorkspace,
  type MoneyFilesAnalysisResult,
  type MoneyAnalysisResult,
  type MoneyTransaction,
  type MoneyWorkspace,
} from "@/lib/moneymirror"

const keys = {
  workspace: "moneymirror:workspace",
  transactions: "moneymirror:transactions",
  report: "moneymirror:report",
}

export function loadWorkspace() {
  const workspace = readJson<unknown | null>(keys.workspace, null)
  if (workspace) {
    const migrated = migrateMoneyWorkspace(workspace)
    if (JSON.stringify(workspace) !== JSON.stringify(migrated)) saveWorkspace(migrated)
    return migrated
  }

  const legacyTransactions = readJson<MoneyTransaction[]>(keys.transactions, [])
  if (legacyTransactions.length === 0) return createMoneyWorkspace()

  const migrated = createWorkspaceFromTransactions("Migrated workspace", legacyTransactions)
  saveWorkspace(migrated)
  return migrated
}

export function saveWorkspace(workspace: MoneyWorkspace) {
  const transactions = getWorkspaceTransactions(workspace)
  writeJson(keys.workspace, workspace)
  writeJson(keys.transactions, transactions)
  writeJson(keys.report, buildMoneyReport(transactions))
}

export function appendAnalysisToStoredWorkspace(
  workspace: MoneyWorkspace,
  analysis: MoneyAnalysisResult | MoneyFilesAnalysisResult
) {
  const next = appendAnalysisToWorkspace(workspace, analysis)
  saveWorkspace(next)
  return next
}

export function clearMoneyMirrorData() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(keys.workspace)
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
