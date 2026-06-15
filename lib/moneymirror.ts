export type TransactionType = "income" | "debit" | "transfer"

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
  uploadId: string
  date: string
  description: string
  amount: number
  type: TransactionType
  category: MoneyCategory
  confidence: number
  reason: string
}

export type MoneyInsight = {
  label: string
  value: string
  detail: string
}

export type MoneyReport = {
  id: string
  uploadId: string
  createdAt: string
  summary: string
  insights: MoneyInsight[]
  suggestions: string[]
}

export type MoneyMetrics = {
  totalIncome: number
  totalExpenses: number
  netCashflow: number
  biggestCategory: string
  biggestCategoryAmount: number
  topMoneyLeak: string
  topMoneyLeakAmount: number
  categoryTotals: Array<{ category: MoneyCategory; amount: number }>
  merchantTotals: Array<{ merchant: string; amount: number; count: number }>
  recentTransactions: MoneyTransaction[]
  biggestTransactions: MoneyTransaction[]
}

type Rule = {
  category: MoneyCategory
  confidence: number
  reason: string
  keywords: string[]
}

const categoryRules: Rule[] = [
  {
    category: "Food",
    confidence: 0.94,
    reason: "Food delivery, dining, or cafe merchant",
    keywords: ["zomato", "swiggy", "restaurant", "cafe", "coffee", "starbucks", "dominos", "pizza", "food", "dining"],
  },
  {
    category: "Rent",
    confidence: 0.95,
    reason: "Rent or housing payment",
    keywords: ["rent", "landlord", "apartment", "housing", "lease"],
  },
  {
    category: "Travel",
    confidence: 0.91,
    reason: "Transport, commute, or travel merchant",
    keywords: ["uber", "ola", "rapido", "metro", "train", "flight", "airline", "cab", "taxi", "fuel", "petrol", "irctc"],
  },
  {
    category: "Shopping",
    confidence: 0.9,
    reason: "Retail or ecommerce purchase",
    keywords: ["amazon", "flipkart", "myntra", "nykaa", "mall", "store", "retail", "market"],
  },
  {
    category: "Subscriptions",
    confidence: 0.93,
    reason: "Recurring media or software subscription",
    keywords: ["netflix", "spotify", "prime", "hotstar", "youtube", "icloud", "subscription"],
  },
  {
    category: "Tools",
    confidence: 0.9,
    reason: "Productivity, developer, or work software",
    keywords: ["openai", "github", "vercel", "figma", "notion", "cursor", "software", "saas"],
  },
  {
    category: "Bills",
    confidence: 0.91,
    reason: "Utility, phone, internet, or insurance bill",
    keywords: ["electricity", "water", "gas", "airtel", "jio", "vodafone", "broadband", "wifi", "insurance", "bill"],
  },
  {
    category: "Cash Withdrawal",
    confidence: 0.96,
    reason: "ATM or cash withdrawal",
    keywords: ["atm", "cash withdrawal", "withdrawal"],
  },
  {
    category: "Investment",
    confidence: 0.93,
    reason: "Investment, broker, or SIP transfer",
    keywords: ["sip", "mutual", "zerodha", "groww", "stock", "fund", "investment"],
  },
  {
    category: "Transfers",
    confidence: 0.82,
    reason: "Peer transfer or bank transfer",
    keywords: ["upi", "imps", "neft", "rtgs", "transfer", "wallet"],
  },
]

export const moneyCategories: MoneyCategory[] = [
  "Income",
  "Food",
  "Rent",
  "Travel",
  "Shopping",
  "Subscriptions",
  "Tools",
  "Bills",
  "Transfers",
  "Cash Withdrawal",
  "Investment",
  "Miscellaneous",
]

export const sampleCsv = `date,description,amount
2026-06-01,SALARY CREDIT,95000
2026-06-02,ZOMATO PAYMENT,-640
2026-06-03,UBER TRIP,-420
2026-06-04,NETFLIX SUBSCRIPTION,-649
2026-06-05,RENT TO LANDLORD,-24000
2026-06-06,AMAZON MARKETPLACE,-2799
2026-06-07,AIRTEL BROADBAND BILL,-999
2026-06-08,SWIGGY DINNER,-780
2026-06-09,OPENAI API,-1650
2026-06-10,ATM CASH WITHDRAWAL,-5000
2026-06-11,GROWW SIP,-7000
2026-06-12,INTEREST CREDIT,850
2026-06-13,OLA CAB,-360
2026-06-14,SPOTIFY SUBSCRIPTION,-119`

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function parseMoneyCsv(csvText: string, uploadId = createId("upload")) {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    return { transactions: [] as MoneyTransaction[], errors: ["CSV needs a header row and at least one transaction row."] }
  }

  const headers = rows[0].map(normalizeHeader)
  const dateIndex = findHeader(headers, ["date", "transaction date", "txn date", "value date"])
  const descriptionIndex = findHeader(headers, ["description", "narration", "details", "merchant", "particulars"])
  const amountIndex = findHeader(headers, ["amount", "transaction amount", "amt"])
  const debitIndex = findHeader(headers, ["debit", "withdrawal", "paid out"])
  const creditIndex = findHeader(headers, ["credit", "deposit", "paid in"])

  const errors: string[] = []
  if (dateIndex < 0) errors.push("Could not find a date column.")
  if (descriptionIndex < 0) errors.push("Could not find a description column.")
  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) {
    errors.push("Could not find amount, debit, or credit columns.")
  }

  if (errors.length > 0) {
    return { transactions: [] as MoneyTransaction[], errors }
  }

  const transactions = rows.slice(1).flatMap((row, index) => {
    const date = normalizeDate(row[dateIndex])
    const description = cleanText(row[descriptionIndex])
    const amount = amountIndex >= 0 ? parseAmount(row[amountIndex]) : parseDebitCredit(row[debitIndex], row[creditIndex])

    if (!date || !description || Number.isNaN(amount) || amount === 0) {
      errors.push(`Skipped row ${index + 2}: missing date, description, or non-zero amount.`)
      return []
    }

    const base: MoneyTransaction = {
      id: createId("txn"),
      uploadId,
      date,
      description,
      amount,
      type: amount > 0 ? "income" : "debit",
      category: amount > 0 ? "Income" : "Miscellaneous",
      confidence: amount > 0 ? 0.98 : 0.35,
      reason: amount > 0 ? "Positive amount treated as income" : "Waiting for categorization",
    }

    return [base]
  })

  return { transactions, errors }
}

export function categorizeTransactions(transactions: MoneyTransaction[]) {
  return transactions.map(categorizeTransaction)
}

export function categorizeTransaction(transaction: MoneyTransaction): MoneyTransaction {
  if (transaction.reason === "Manually edited by user") {
    return transaction
  }

  if (transaction.amount > 0) {
    return {
      ...transaction,
      type: "income",
      category: "Income",
      confidence: 0.98,
      reason: "Positive amount treated as income",
    }
  }

  const haystack = transaction.description.toLowerCase()
  const rule = categoryRules.find((candidate) => candidate.keywords.some((keyword) => haystack.includes(keyword)))

  if (!rule) {
    return {
      ...transaction,
      type: "debit",
      category: "Miscellaneous",
      confidence: 0.45,
      reason: "No strong merchant pattern matched",
    }
  }

  return {
    ...transaction,
    type: rule.category === "Transfers" ? "transfer" : "debit",
    category: rule.category,
    confidence: rule.confidence,
    reason: rule.reason,
  }
}

export function getMoneyMetrics(transactions: MoneyTransaction[]): MoneyMetrics {
  const incomeTransactions = transactions.filter((transaction) => transaction.amount > 0)
  const expenseTransactions = transactions.filter((transaction) => transaction.amount < 0 && transaction.category !== "Transfers")

  const totalIncome = sum(incomeTransactions.map((transaction) => transaction.amount))
  const totalExpenses = Math.abs(sum(expenseTransactions.map((transaction) => transaction.amount)))
  const categoryTotals = groupTotals(expenseTransactions, (transaction) => transaction.category)
    .map(([category, amount]) => ({ category: category as MoneyCategory, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const merchantTotals = groupMerchantTotals(expenseTransactions)
  const biggestCategory = categoryTotals[0]
  const topLeak = merchantTotals.find((merchant) => merchant.count > 1) ?? merchantTotals[0]

  return {
    totalIncome,
    totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    biggestCategory: biggestCategory?.category ?? "None yet",
    biggestCategoryAmount: biggestCategory?.amount ?? 0,
    topMoneyLeak: topLeak?.merchant ?? "None yet",
    topMoneyLeakAmount: topLeak?.amount ?? 0,
    categoryTotals,
    merchantTotals,
    recentTransactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    biggestTransactions: [...expenseTransactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 8),
  }
}

export function buildMoneyReport(transactions: MoneyTransaction[]): MoneyReport {
  const metrics = getMoneyMetrics(transactions)
  const savingsTarget = Math.round(metrics.biggestCategoryAmount * 0.25)
  const repeated = metrics.merchantTotals.filter((merchant) => merchant.count > 1).slice(0, 3)
  const repeatedList = repeated.map((merchant) => merchant.merchant).join(", ") || "no repeated merchants yet"

  const summary =
    transactions.length === 0
      ? "Upload transactions to generate a MoneyMirror summary."
      : `Most money went to ${metrics.biggestCategory}, with ${formatCurrency(metrics.biggestCategoryAmount)} spent there. Repeated expenses include ${repeatedList}. Net cashflow is ${formatCurrency(metrics.netCashflow)}.`

  return {
    id: createId("report"),
    uploadId: transactions[0]?.uploadId ?? createId("upload"),
    createdAt: new Date().toISOString(),
    summary,
    insights: [
      {
        label: "Biggest category",
        value: metrics.biggestCategory,
        detail: `${formatCurrency(metrics.biggestCategoryAmount)} in categorized spend.`,
      },
      {
        label: "Top money leak",
        value: metrics.topMoneyLeak,
        detail: `${formatCurrency(metrics.topMoneyLeakAmount)} across repeated or high-value spending.`,
      },
      {
        label: "Cashflow",
        value: formatCurrency(metrics.netCashflow),
        detail: metrics.netCashflow >= 0 ? "Income is currently covering tracked expenses." : "Tracked expenses are above income.",
      },
    ],
    suggestions: [
      savingsTarget > 0
        ? `Cutting ${metrics.biggestCategory} by 25% could free up about ${formatCurrency(savingsTarget)}.`
        : "Add more transactions to estimate a realistic savings target.",
      repeated.length > 0
        ? `Review repeated payments to ${repeatedList} before the next billing cycle.`
        : "Look for repeated merchants once more transactions are uploaded.",
      metrics.netCashflow >= 0
        ? "Move leftover cash into savings before lifestyle spending expands to absorb it."
        : "Pause flexible categories until income and expenses are back in balance.",
    ],
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function parseCsv(csvText: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index]
    const next = csvText[index + 1]

    if (char === '"' && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim())
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ")
}

function findHeader(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header))
}

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeDate(value = "") {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!match) return trimmed

  const [, first, second, rawYear] = match
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  const month = Number(second) > 12 ? first : second
  const day = Number(second) > 12 ? second : first
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function parseAmount(value = "") {
  const normalized = value.replace(/[^\d.-]/g, "")
  const amount = Number(normalized)
  if (Number.isNaN(amount)) return Number.NaN
  return amount
}

function parseDebitCredit(debit = "", credit = "") {
  const debitAmount = parseAmount(debit)
  const creditAmount = parseAmount(credit)
  if (!Number.isNaN(creditAmount) && creditAmount > 0) return creditAmount
  if (!Number.isNaN(debitAmount) && debitAmount > 0) return -debitAmount
  return Number.NaN
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function groupTotals<T>(items: T[], getKey: (item: T) => string) {
  const totals = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item)
    const amount = (item as MoneyTransaction).amount
    totals.set(key, (totals.get(key) ?? 0) + amount)
  }
  return Array.from(totals.entries())
}

function groupMerchantTotals(transactions: MoneyTransaction[]) {
  const totals = new Map<string, { amount: number; count: number }>()

  for (const transaction of transactions) {
    const merchant = normalizeMerchant(transaction.description)
    const current = totals.get(merchant) ?? { amount: 0, count: 0 }
    totals.set(merchant, {
      amount: current.amount + Math.abs(transaction.amount),
      count: current.count + 1,
    })
  }

  return Array.from(totals.entries())
    .map(([merchant, value]) => ({ merchant, ...value }))
    .sort((a, b) => b.amount - a.amount)
}

function normalizeMerchant(description: string) {
  return description
    .replace(/\b(payment|debit|credit|txn|transaction|upi|to|from)\b/gi, "")
    .replace(/[^a-z0-9 ]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32)
    .toUpperCase()
}
