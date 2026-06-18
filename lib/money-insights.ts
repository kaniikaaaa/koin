import { formatCurrency } from "@/lib/money-format"
import { getMoneyMetrics, getMonthlyMetrics } from "@/lib/money-metrics"
import type {
  MoneyCategory,
  MonthlyMoneyMetrics,
  MonthlySuggestion,
  MoneyReport,
  MoneyTransaction,
} from "@/lib/money-types"

type CategoryTotal = { category: MoneyCategory; amount: number }

// Discretionary categories the user can realistically cut, in priority order.
// `rate` is how much of that category is typically trimmable; `tip` is the move.
const DISCRETIONARY_CUTS: { category: MoneyCategory; rate: number; tip: string }[] = [
  { category: "Subscriptions", rate: 0.5, tip: "cancel plans you no longer actively use" },
  { category: "Shopping", rate: 0.3, tip: "pause non-essential orders for a month" },
  { category: "Travel", rate: 0.25, tip: "batch trips or pick cheaper options" },
  { category: "Food", rate: 0.2, tip: "cook more and cut food delivery" },
  { category: "Tools", rate: 0.25, tip: "drop overlapping or unused tools" },
  { category: "Miscellaneous", rate: 0.25, tip: "label these and question the unplanned ones" },
  { category: "Cash Withdrawal", rate: 0.15, tip: "track where the cash actually goes" },
]

// Fixed / non-discretionary categories — never suggest cutting these first.
const FIXED_CATEGORIES: MoneyCategory[] = ["Rent", "Bills", "Investment", "Transfers", "Income"]

type CutTarget = { category: MoneyCategory; amount: number; rate: number; tip: string; saving: number }

// Rank cuttable categories by realistic monthly savings (biggest win first).
function rankDiscretionaryCuts(categoryTotals: CategoryTotal[]): CutTarget[] {
  const amountByCategory = new Map(categoryTotals.map((item) => [item.category, item.amount]))

  return DISCRETIONARY_CUTS.map((cut) => {
    const amount = amountByCategory.get(cut.category) ?? 0
    return { ...cut, amount, saving: Math.round(amount * cut.rate) }
  })
    .filter((cut) => cut.saving > 0)
    .sort((a, b) => b.saving - a.saving)
}

// The largest fixed cost present, used only to explain what NOT to cut first.
function biggestFixedCost(categoryTotals: CategoryTotal[]): MoneyCategory | undefined {
  return categoryTotals
    .filter((item) => FIXED_CATEGORIES.includes(item.category) && item.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0]?.category
}

function asPercent(rate: number) {
  return `${Math.round(rate * 100)}%`
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function buildMoneyReport(transactions: MoneyTransaction[], workspaceId?: string): MoneyReport {
  const metrics = getMoneyMetrics(transactions)
  const monthlyMetrics = getMonthlyMetrics(transactions)
  const cutTargets = rankDiscretionaryCuts(metrics.categoryTotals)
  const primaryCut = cutTargets[0]
  const secondaryCut = cutTargets[1]
  const fixedAnchor = biggestFixedCost(metrics.categoryTotals)
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
      primaryCut
        ? `Start with ${primaryCut.category}: ${primaryCut.tip}. Trimming ~${asPercent(primaryCut.rate)} frees about ${formatCurrency(primaryCut.saving)}${fixedAnchor ? ` — fixed costs like ${fixedAnchor} aren't worth targeting first` : ""}.`
        : `Most spend sits in fixed costs${fixedAnchor ? ` like ${fixedAnchor}` : ""}. Track flexible areas (subscriptions, shopping, travel) to find realistic cuts.`,
      secondaryCut
        ? `Next, ${secondaryCut.tip} in ${secondaryCut.category} to save about ${formatCurrency(secondaryCut.saving)} more.`
        : repeated.length > 0
          ? `Review repeated payments to ${repeatedList} before the next billing cycle.`
          : "Upload more transactions to surface repeated, cuttable spends.",
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

  const monthlyCut = rankDiscretionaryCuts(currentMonth.categoryTotals)[0]
  if (monthlyCut) {
    const fixedAnchor = biggestFixedCost(currentMonth.categoryTotals)
    suggestions.push({
      id: `${currentMonth.month}-cut-category`,
      tone: "suggestion",
      title: `Trim ${monthlyCut.category}`,
      detail: `${capitalize(monthlyCut.tip)}. A ${asPercent(monthlyCut.rate)} cut here could free about ${formatCurrency(monthlyCut.saving)} next month — far easier than touching fixed costs${fixedAnchor ? ` like ${fixedAnchor}` : ""}.`,
      value: formatCurrency(monthlyCut.amount),
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
    .filter((item) => !FIXED_CATEGORIES.includes(item.category))
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
