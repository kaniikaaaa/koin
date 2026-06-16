export type TransactionType = "income" | "debit" | "transfer"

export type MoneySourceType = "csv" | "pdf" | "screenshot"

export type MoneyCategory =
  | "Income"
  | "Food"
  | "Rent"
  | "Travel"
  | "Shopping"
  | "Subscriptions"
  | "Tools"
  | "Bills"
  | "Transfers"
  | "Cash Withdrawal"
  | "Investment"
  | "Miscellaneous"

export type MoneyTransaction = {
  id: string
  statementId: string
  date: string
  monthKey: string
  description: string
  merchant: string
  amount: number
  type: TransactionType
  category: MoneyCategory
  confidence: number
  reason: string
}

export type MoneyStatement = {
  id: string
  fileName: string
  sourceType: MoneySourceType
  uploadedAt: string
  transactionIds: string[]
  errors: string[]
}

export type MoneyWorkspace = {
  version: 2
  id: string
  createdAt: string
  updatedAt: string
  statements: MoneyStatement[]
  transactionsById: Record<string, MoneyTransaction>
}

export type MoneyInsight = {
  label: string
  value: string
  detail: string
}

export type MoneyReport = {
  id: string
  workspaceId?: string
  createdAt: string
  summary: string
  insights: MoneyInsight[]
  suggestions: string[]
}

export type MoneyAnalysisResult = {
  statement: MoneyStatement
  transactions: MoneyTransaction[]
  transactionsById: Record<string, MoneyTransaction>
  errors: string[]
  report: MoneyReport
}

export type MoneyFilesAnalysisResult = {
  statements: MoneyStatement[]
  transactions: MoneyTransaction[]
  transactionsById: Record<string, MoneyTransaction>
  errors: string[]
}

export type CategoryTotal = {
  category: MoneyCategory
  amount: number
}

export type MerchantTotal = {
  merchant: string
  amount: number
  count: number
}

export type MoneyMetrics = {
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  biggestCategory: string
  biggestCategoryAmount: number
  topMoneyLeak: string
  topMoneyLeakAmount: number
  categoryTotals: CategoryTotal[]
  merchantTotals: MerchantTotal[]
  recentTransactions: MoneyTransaction[]
  biggestTransactions: MoneyTransaction[]
}

export type MonthlyMoneyMetrics = MoneyMetrics & {
  month: string
  monthLabel: string
  transactionCount: number
}

export type MonthlySuggestion = {
  id: string
  tone: "suggestion" | "appreciation" | "warning"
  title: string
  detail: string
  value?: string
}
