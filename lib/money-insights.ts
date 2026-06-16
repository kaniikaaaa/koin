import { formatCurrency } from "@/lib/money-format"
import { getMoneyMetrics, getMonthlyMetrics } from "@/lib/money-metrics"
import type { MonthlyMoneyMetrics, MonthlySuggestion, MoneyReport, MoneyTransaction } from "@/lib/money-types"

export function buildMoneyReport(transactions: MoneyTransaction[], workspaceId?: string): MoneyReport {
  const metrics = getMoneyMetrics(transactions)
  const monthlyMetrics = getMonthlyMetrics(transactions)
  const savingsTarget = Math.round(metrics.biggestCategoryAmount * 0.25)
  const repeated = metrics.merchantTotals.filter((merchant) => merchant.count > 1).slice(0, 3)
  const repeatedList = repeated.map((merchant) => merchant.merchant).join(", ") || "no repeated merchants yet"
  const comparisonLine =
    monthlyMetrics.length > 1
      ? `The latest month is ${monthlyMetrics.at(-1)?.monthLabel}, compared with ${monthlyMetrics.at(-2)?.monthLabel}.`
      : "Upload another month to unlock month-on-month comparison."

  const summary =
    transactions.length === 0
      ? "Upload transactions to generate a MoneyMirror summary."
      : `Most money went to ${metrics.biggestCategory}, with ${formatCurrency(metrics.biggestCategoryAmount)} spent there. Repeated expenses include ${repeatedList}. Net cashflow is ${formatCurrency(metrics.netCashflow)}. ${comparisonLine}`

  return {
    id: `report_${Date.now().toString(36)}`,
    workspaceId,
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
        detail: metrics.netCashflow >= 0 ? "Income is covering tracked expenses." : "Tracked expenses are above income.",
      },
    ],
    suggestions: [
      savingsTarget > 0
        ? `Cutting ${metrics.biggestCategory} by 25% could free up about ${formatCurrency(savingsTarget)}.`
        : "Add more debit transactions to estimate a realistic savings target.",
      repeated.length > 0
        ? `Review repeated payments to ${repeatedList} before the next billing cycle.`
        : "Look for repeated merchants once more transactions are uploaded.",
      metrics.netCashflow >= 0
        ? `Consider moving part of the ${formatCurrency(metrics.netCashflow)} surplus into an emergency fund, SIP, or low-cost index fund.`
        : "Stabilize cashflow first, then restart savings and investing from a small fixed amount.",
    ],
  }
}

export function buildMonthlySuggestions(
  currentMonth?: MonthlyMoneyMetrics,
  previousMonth?: MonthlyMoneyMetrics
): MonthlySuggestion[] {
  if (!currentMonth) return []

  const suggestions: MonthlySuggestion[] = []

  if (currentMonth.biggestCategoryAmount > 0) {
    const target = Math.round(currentMonth.biggestCategoryAmount * 0.15)
    suggestions.push({
      id: `${currentMonth.month}-cut-category`,
      tone: "suggestion",
      title: `Trim ${currentMonth.biggestCategory}`,
      detail: `This was the biggest spend area in ${currentMonth.monthLabel}. A 15% cut could free up about ${formatCurrency(target)} next month.`,
      value: formatCurrency(currentMonth.biggestCategoryAmount),
    })
  }

  if (previousMonth) {
    suggestions.push(...buildIncreaseWarnings(currentMonth, previousMonth))
    suggestions.push(...buildImprovementNotes(currentMonth, previousMonth))
    suggestions.push(...buildInvestmentNotes(currentMonth, previousMonth))
  }

  suggestions.push({
    id: `${currentMonth.month}-cashflow`,
    tone: currentMonth.netCashflow >= 0 ? "appreciation" : "warning",
    title: currentMonth.netCashflow >= 0 ? "Cashflow stayed positive" : "Cashflow needs attention",
    detail:
      currentMonth.netCashflow >= 0
        ? `You kept ${formatCurrency(currentMonth.netCashflow)} after tracked expenses. Move that surplus before casual spending absorbs it.`
        : `Expenses were above income by ${formatCurrency(Math.abs(currentMonth.netCashflow))}. Slow flexible categories until this turns positive.`,
    value: formatCurrency(currentMonth.netCashflow),
  })

  suggestions.push({
    id: `${currentMonth.month}-investing`,
    tone: currentMonth.netCashflow >= 0 ? "suggestion" : "warning",
    title: currentMonth.netCashflow >= 0 ? "Put surplus to work" : "Protect the basics first",
    detail:
      currentMonth.netCashflow >= 0
        ? `A small fixed SIP or index-fund contribution from this surplus can make saving automatic. Keep emergency cash separate before investing.`
        : "Build a small emergency buffer before increasing investments. The first win is making monthly cashflow stable.",
  })

  if (currentMonth.topMoneyLeak !== "None yet") {
    suggestions.push({
      id: `${currentMonth.month}-leak`,
      tone: "suggestion",
      title: "Review the repeated leak",
      detail: `${currentMonth.topMoneyLeak} is the top repeated or high-value spend pattern for ${currentMonth.monthLabel}. Check if it still deserves that budget.`,
      value: formatCurrency(currentMonth.topMoneyLeakAmount),
    })
  }

  return suggestions
}

function buildIncreaseWarnings(currentMonth: MonthlyMoneyMetrics, previousMonth: MonthlyMoneyMetrics): MonthlySuggestion[] {
  const previousByCategory = new Map(previousMonth.categoryTotals.map((item) => [item.category, item.amount]))

  return currentMonth.categoryTotals
    .map((current) => {
      const previousAmount = previousByCategory.get(current.category) ?? 0
      return {
        category: current.category,
        increase: current.amount - previousAmount,
        previousAmount,
        currentAmount: current.amount,
      }
    })
    .filter((item) => item.increase > Math.max(500, item.previousAmount * 0.15))
    .filter((item) => item.category !== "Investment" && item.category !== "Transfers")
    .sort((a, b) => b.increase - a.increase)
    .slice(0, 2)
    .map((item) => ({
      id: `${currentMonth.month}-warning-${item.category}`,
      tone: "warning" as const,
      title: `${item.category} moved up`,
      detail: `You spent ${formatCurrency(item.increase)} more than ${previousMonth.monthLabel} in this category. This is the first place to check for impulse or repeated spending.`,
      value: `+${formatCurrency(item.increase)}`,
    }))
}

function buildImprovementNotes(currentMonth: MonthlyMoneyMetrics, previousMonth: MonthlyMoneyMetrics): MonthlySuggestion[] {
  const currentByCategory = new Map(currentMonth.categoryTotals.map((item) => [item.category, item.amount]))

  return previousMonth.categoryTotals
    .map((previous) => ({
      category: previous.category,
      decrease: previous.amount - (currentByCategory.get(previous.category) ?? 0),
    }))
    .filter((item) => item.decrease > 0)
    .sort((a, b) => b.decrease - a.decrease)
    .slice(0, 2)
    .map((item) => ({
      id: `${currentMonth.month}-appreciate-${item.category}`,
      tone: "appreciation" as const,
      title: `Nice control on ${item.category}`,
      detail: `You spent ${formatCurrency(item.decrease)} less than ${previousMonth.monthLabel} in this department. That discipline is worth keeping.`,
      value: `-${formatCurrency(item.decrease)}`,
    }))
}

function buildInvestmentNotes(currentMonth: MonthlyMoneyMetrics, previousMonth: MonthlyMoneyMetrics): MonthlySuggestion[] {
  const previousInvestment = previousMonth.categoryTotals.find((item) => item.category === "Investment")?.amount ?? 0
  const currentInvestment = currentMonth.categoryTotals.find((item) => item.category === "Investment")?.amount ?? 0
  const increase = currentInvestment - previousInvestment

  if (increase <= 0) return []

  return [
    {
      id: `${currentMonth.month}-investment-progress`,
      tone: "appreciation",
      title: "Investment discipline improved",
      detail: `You invested ${formatCurrency(increase)} more than ${previousMonth.monthLabel}. Keep it automatic and avoid stretching emergency cash.`,
      value: `+${formatCurrency(increase)}`,
    },
  ]
}
