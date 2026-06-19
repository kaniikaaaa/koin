import type { MoneyCategory, MoneyTransaction } from "@/lib/money-types"

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Match keywords on word boundaries so "gas" doesn't fire on "Las Vegas" and
// "rent" doesn't fire on "current"/"parent". Compiled once per rule.
const compiledRules = categoryRules.map((rule) => ({
  ...rule,
  pattern: new RegExp(`\\b(${rule.keywords.map(escapeRegExp).join("|")})\\b`, "i"),
}))

// Positive amounts that are really reversals of spend (refunds, cashback,
// chargebacks) rather than income — kept out of the income total.
const REFUND_PATTERN = /\b(refunds?|refunded|reversals?|reversed|charge\s?backs?|cashback|returned)\b/i

export const moneyCategories: MoneyCategory[] = [
  "Income",
  "Refund",
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

export function isMoneyCategory(value: string): value is MoneyCategory {
  return moneyCategories.includes(value as MoneyCategory)
}

export function categorizeTransactions(transactions: MoneyTransaction[]) {
  return transactions.map(categorizeTransaction)
}

export function categorizeTransaction(transaction: MoneyTransaction): MoneyTransaction {
  if (transaction.reason === "Manually edited by user") return transaction

  if (transaction.amount > 0) {
    if (REFUND_PATTERN.test(`${transaction.description} ${transaction.merchant}`)) {
      return {
        ...transaction,
        type: "refund",
        category: "Refund",
        confidence: 0.9,
        reason: "Refund or reversal — kept out of income",
      }
    }

    return {
      ...transaction,
      type: "income",
      category: "Income",
      confidence: 0.98,
      reason: "Positive amount treated as income",
    }
  }

  const haystack = `${transaction.description} ${transaction.merchant}`
  const rule = compiledRules.find((candidate) => candidate.pattern.test(haystack))

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
