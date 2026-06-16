import { formatMonthLabel, getMonthSortValue, toMonthKey } from "@/lib/money-format"
import type { MoneyCategory, MoneyMetrics, MoneyTransaction, MonthlyMoneyMetrics } from "@/lib/money-types"

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

export function getMonthlyMetrics(transactions: MoneyTransaction[]): MonthlyMoneyMetrics[] {
  const grouped = new Map<string, MoneyTransaction[]>()

  for (const transaction of transactions) {
    const month = transaction.monthKey || toMonthKey(transaction.date)
    grouped.set(month, [...(grouped.get(month) ?? []), transaction])
  }

  return Array.from(grouped.entries())
    .sort(([monthA], [monthB]) => getMonthSortValue(monthA) - getMonthSortValue(monthB))
    .map(([month, monthTransactions]) => ({
      ...getMoneyMetrics(monthTransactions),
      month,
      monthLabel: formatMonthLabel(month),
      transactionCount: monthTransactions.length,
    }))
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function groupTotals<T extends MoneyTransaction>(items: T[], getKey: (item: T) => string) {
  const totals = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item)
    totals.set(key, (totals.get(key) ?? 0) + item.amount)
  }
  return Array.from(totals.entries())
}

function groupMerchantTotals(transactions: MoneyTransaction[]) {
  const totals = new Map<string, { amount: number; count: number }>()

  for (const transaction of transactions) {
    const merchant = transaction.merchant || transaction.description
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
