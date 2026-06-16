import { isMoneyCategory } from "@/lib/money-categorizer"
import { normalizeMerchant } from "@/lib/money-csv"
import { toMonthKey } from "@/lib/money-format"
import { createId } from "@/lib/money-id"
import type {
  MoneyAnalysisResult,
  MoneyCategory,
  MoneyFilesAnalysisResult,
  MoneySourceType,
  MoneyStatement,
  MoneyTransaction,
  MoneyWorkspace,
  TransactionType,
} from "@/lib/money-types"

type AppendableAnalysis = Pick<MoneyFilesAnalysisResult, "statements" | "transactionsById">

export function createMoneyWorkspace(
  statements: MoneyStatement[] = [],
  transactionsById: Record<string, MoneyTransaction> = {}
): MoneyWorkspace {
  const now = new Date().toISOString()
  return {
    version: 2,
    id: createId("workspace"),
    createdAt: now,
    updatedAt: now,
    statements,
    transactionsById,
  }
}

export function createMoneyStatement(
  fileName: string,
  transactions: MoneyTransaction[],
  errors: string[] = [],
  sourceType: MoneySourceType = "csv",
  id = transactions[0]?.statementId ?? createId("statement")
): MoneyStatement {
  return {
    id,
    fileName,
    sourceType,
    uploadedAt: new Date().toISOString(),
    transactionIds: transactions.map((transaction) => transaction.id),
    errors,
  }
}

export function indexTransactions(transactions: MoneyTransaction[]) {
  return Object.fromEntries(transactions.map((transaction) => [transaction.id, transaction]))
}

export function appendAnalysisToWorkspace(
  workspace: MoneyWorkspace,
  analysis: MoneyAnalysisResult | AppendableAnalysis
): MoneyWorkspace {
  const statements = "statement" in analysis ? [analysis.statement] : analysis.statements

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    statements: [...workspace.statements, ...statements],
    transactionsById: {
      ...workspace.transactionsById,
      ...analysis.transactionsById,
    },
  }
}

export function appendMoneyStatements(
  workspace: MoneyWorkspace,
  statements: MoneyStatement[],
  transactionsById: Record<string, MoneyTransaction> = {}
): MoneyWorkspace {
  return appendAnalysisToWorkspace(workspace, { statements, transactionsById })
}

export function getWorkspaceTransactions(workspace: MoneyWorkspace) {
  const seen = new Set<string>()
  const ordered: MoneyTransaction[] = []

  for (const statement of workspace.statements) {
    for (const transactionId of statement.transactionIds) {
      const transaction = workspace.transactionsById[transactionId]
      if (!transaction || seen.has(transaction.id)) continue
      ordered.push(transaction)
      seen.add(transaction.id)
    }
  }

  for (const transaction of Object.values(workspace.transactionsById)) {
    if (seen.has(transaction.id)) continue
    ordered.push(transaction)
  }

  return ordered
}

export function updateWorkspaceTransactionCategory(
  workspace: MoneyWorkspace,
  transactionId: string,
  category: MoneyCategory
): MoneyWorkspace {
  const transaction = workspace.transactionsById[transactionId]
  if (!transaction) return workspace

  const type: TransactionType = category === "Income" ? "income" : category === "Transfers" ? "transfer" : "debit"

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    transactionsById: {
      ...workspace.transactionsById,
      [transactionId]: {
        ...transaction,
        category,
        type,
        confidence: 1,
        reason: "Manually edited by user",
      },
    },
  }
}

export function removeWorkspaceTransaction(workspace: MoneyWorkspace, transactionId: string): MoneyWorkspace {
  const transactionsById = { ...workspace.transactionsById }
  delete transactionsById[transactionId]

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    transactionsById,
    statements: workspace.statements.map((statement) => ({
      ...statement,
      transactionIds: statement.transactionIds.filter((id) => id !== transactionId),
    })),
  }
}

export function migrateMoneyWorkspace(raw: unknown): MoneyWorkspace {
  if (!isRecord(raw)) return createMoneyWorkspace()

  const workspaceId = readString(raw.id) ?? createId("workspace")
  const createdAt = readString(raw.createdAt) ?? new Date().toISOString()
  const updatedAt = readString(raw.updatedAt) ?? createdAt
  const storedTransactions = readTransactionRecord(raw.transactionsById)
  const rawTransactionRecord = isRecord(raw.transactionsById) ? raw.transactionsById : {}
  const transactionsById: Record<string, MoneyTransaction> = {}
  const statements: MoneyStatement[] = []

  const rawStatements = Array.isArray(raw.statements) ? raw.statements : []
  for (const rawStatement of rawStatements) {
    if (!isRecord(rawStatement)) continue

    const statementId = readString(rawStatement.id) ?? createId("statement")
    const nestedTransactions = Array.isArray(rawStatement.transactions) ? rawStatement.transactions : []
    const rawTransactionIds = Array.isArray(rawStatement.transactionIds) ? rawStatement.transactionIds : []
    const transactionIds: string[] = []

    for (const nestedTransaction of nestedTransactions) {
      const transaction = normalizeStoredTransaction(nestedTransaction, statementId)
      if (!transaction) continue
      transactionsById[transaction.id] = transaction
      transactionIds.push(transaction.id)
    }

    for (const rawTransactionId of rawTransactionIds) {
      const transactionId = readString(rawTransactionId)
      if (!transactionId) continue
      const transaction = normalizeStoredTransaction(rawTransactionRecord[transactionId], statementId)
      if (!transaction) continue
      transactionsById[transaction.id] = transaction
      transactionIds.push(transaction.id)
    }

    statements.push({
      id: statementId,
      fileName: readString(rawStatement.fileName) ?? "Imported statement",
      sourceType: readSourceType(rawStatement.sourceType),
      uploadedAt: readString(rawStatement.uploadedAt) ?? updatedAt,
      transactionIds: Array.from(new Set(transactionIds)),
      errors: readStringArray(rawStatement.errors),
    })
  }

  for (const transaction of Object.values(storedTransactions)) {
    const normalized = normalizeStoredTransaction(transaction, transaction.statementId)
    if (normalized) transactionsById[normalized.id] = normalized
  }

  if (statements.length === 0 && Object.keys(transactionsById).length > 0) {
    const transactions = Object.values(transactionsById)
    statements.push(createMoneyStatement("Migrated workspace", transactions, [], "csv", transactions[0]?.statementId))
  }

  return {
    version: 2,
    id: workspaceId,
    createdAt,
    updatedAt,
    statements,
    transactionsById,
  }
}

export function createWorkspaceFromTransactions(fileName: string, transactions: MoneyTransaction[]) {
  const statementId = createId("statement")
  const normalized = transactions
    .map((transaction) => normalizeStoredTransaction(transaction, statementId))
    .filter((transaction): transaction is MoneyTransaction => Boolean(transaction))
  const statement = createMoneyStatement(fileName, normalized, [], "csv", statementId)
  return createMoneyWorkspace([statement], indexTransactions(normalized))
}

function normalizeStoredTransaction(raw: unknown, fallbackStatementId: string): MoneyTransaction | null {
  if (!isRecord(raw)) return null

  const amount = readNumber(raw.amount)
  const date = readString(raw.date)
  const description = readString(raw.description)
  if (amount === null || !date || !description) return null

  const categoryText = readString(raw.category)
  const category = categoryText && isMoneyCategory(categoryText) ? categoryText : amount > 0 ? "Income" : "Miscellaneous"
  const statementId = readString(raw.statementId) ?? fallbackStatementId

  return {
    id: readString(raw.id) ?? createId("txn"),
    statementId,
    date,
    monthKey: readString(raw.monthKey) ?? toMonthKey(date),
    description,
    merchant: readString(raw.merchant) ?? normalizeMerchant(description),
    amount,
    type: readTransactionType(raw.type, category, amount),
    category,
    confidence: readNumber(raw.confidence) ?? (amount > 0 ? 0.98 : 0.45),
    reason: readString(raw.reason) ?? "Migrated transaction",
  }
}

function readTransactionRecord(raw: unknown) {
  if (!isRecord(raw)) return {}

  const transactions: Record<string, MoneyTransaction> = {}
  for (const [id, value] of Object.entries(raw)) {
    const transaction = normalizeStoredTransaction(value, createId("statement"))
    if (transaction) transactions[id] = transaction
  }
  return transactions
}

function readTransactionType(raw: unknown, category: MoneyCategory, amount: number): TransactionType {
  if (raw === "income" || raw === "debit" || raw === "transfer") return raw
  if (category === "Transfers") return "transfer"
  return amount > 0 ? "income" : "debit"
}

function readSourceType(raw: unknown): MoneySourceType {
  if (raw === "pdf" || raw === "screenshot") return raw
  return "csv"
}

function readString(raw: unknown) {
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null
}

function readNumber(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readStringArray(raw: unknown) {
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
