"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, FileText, Plus, RefreshCw } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChatPanel } from "@/components/chat-panel"
import { ImportCsvButton } from "@/components/import-csv-button"
import { MonthlySuggestionsDialog } from "@/components/monthly-suggestions-dialog"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  analyzeSampleCsvs,
  buildMoneyReport,
  buildMonthlySuggestions,
  formatCompactCurrency,
  formatCurrency,
  getMonthlyMetrics,
  getMoneyMetrics,
  getWorkspaceTransactions,
  moneyCategories,
  type MoneyCategory,
  type MoneyTransaction,
  type MoneyWorkspace,
} from "@/lib/moneymirror"
import {
  appendAnalysisToStoredWorkspace,
  clearMoneyMirrorData,
  loadWorkspace,
} from "@/lib/moneymirror-storage"

const monthlyChartConfig = {
  totalIncome: {
    label: "Income",
    color: "var(--color-primary)",
  },
  totalExpenses: {
    label: "Expenses",
    color: "var(--color-expense)",
  },
  netCashflow: {
    label: "Cashflow",
    color: "var(--color-accent)",
  },
} satisfies ChartConfig

const categoryChartColors = [
  "#2dd4bf",
  "#b79a55",
  "#7f3f43",
  "#8fb3a6",
  "#7d8aa3",
  "#c0a46d",
  "#6c9088",
  "#9b6b72",
  "#6f7b65",
  "#8d7faa",
  "#a8754f",
]

const expenseFilterCategories = moneyCategories.filter((category) => category !== "Income")

export default function DashboardPage() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<MoneyWorkspace | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<MoneyCategory[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const transactions = useMemo(() => (workspace ? getWorkspaceTransactions(workspace) : []), [workspace])
  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])
  const report = useMemo(() => (transactions.length > 0 ? buildMoneyReport(transactions) : null), [transactions])
  const monthlyMetrics = useMemo(() => getMonthlyMetrics(transactions), [transactions])
  const hasCategoryFilter = selectedCategories.length > 0
  const selectedChartKeys = useMemo(() => selectedCategories.map(getCategoryChartKey), [selectedCategories])
  const activeChartConfig = useMemo<ChartConfig>(() => {
    if (!hasCategoryFilter) return monthlyChartConfig

    return Object.fromEntries(
      selectedCategories.map((category, index) => [
        getCategoryChartKey(category),
        {
          label: category,
          color: categoryChartColors[index % categoryChartColors.length],
        },
      ])
    )
  }, [hasCategoryFilter, selectedCategories])
  const monthlyChartData = useMemo<Array<Record<string, number | string>>>(() => {
    if (!hasCategoryFilter) {
      return monthlyMetrics.map((month) => ({
        month: month.month,
        monthLabel: month.monthLabel,
        totalIncome: month.totalIncome,
        totalExpenses: month.totalExpenses,
        netCashflow: month.netCashflow,
      }))
    }

    return monthlyMetrics.map((month) => {
      const row: Record<string, number | string> = {
        month: month.month,
        monthLabel: month.monthLabel,
      }

      for (const category of selectedCategories) {
        row[getCategoryChartKey(category)] = sumCategorySpend(transactions, month.month, category)
      }

      return row
    })
  }, [hasCategoryFilter, monthlyMetrics, selectedCategories, transactions])
  const filteredExpenseTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.amount >= 0) return false
        if (!hasCategoryFilter) return transaction.category !== "Transfers"
        return selectedCategories.includes(transaction.category)
      }),
    [hasCategoryFilter, selectedCategories, transactions]
  )
  const filteredExpenseTotal = useMemo(
    () => filteredExpenseTransactions.reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
    [filteredExpenseTransactions]
  )
  const filteredCategoryTotals = useMemo(
    () =>
      hasCategoryFilter
        ? selectedCategories
            .map((category) => ({
              category,
              amount: filteredExpenseTransactions
                .filter((transaction) => transaction.category === category)
                .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
            }))
            .filter((item) => item.amount > 0)
            .sort((a, b) => b.amount - a.amount)
        : metrics.categoryTotals,
    [filteredExpenseTransactions, hasCategoryFilter, metrics.categoryTotals, selectedCategories]
  )
  const latestMonth = monthlyMetrics.at(-1)
  const previousMonth = monthlyMetrics.at(-2)
  const monthlySuggestions = useMemo(
    () => buildMonthlySuggestions(latestMonth, previousMonth),
    [latestMonth, previousMonth]
  )
  const hasComparison = monthlyMetrics.length > 1
  const maxCategory = Math.max(...filteredCategoryTotals.map((item) => item.amount), 1)
  const maxFlow = Math.max(metrics.totalIncome, metrics.totalExpenses, 1)
  const chatContext = useMemo(() => {
    if (transactions.length === 0) return undefined

    const lines = [
      `Transactions: ${transactions.length} across ${monthlyMetrics.length} month(s).`,
      `Total income: ${formatCurrency(metrics.totalIncome)}.`,
      `Total expenses: ${formatCurrency(metrics.totalExpenses)}.`,
      `Net cashflow: ${formatCurrency(metrics.netCashflow)}.`,
      `Biggest category: ${metrics.biggestCategory} (${formatCurrency(metrics.biggestCategoryAmount)}).`,
      `Top money leak: ${metrics.topMoneyLeak} (${formatCurrency(metrics.topMoneyLeakAmount)}).`,
    ]

    if (metrics.categoryTotals.length > 0) {
      lines.push("Spending by category:")
      for (const item of metrics.categoryTotals.slice(0, 8)) {
        lines.push(`- ${item.category}: ${formatCurrency(item.amount)}`)
      }
    }

    for (const month of monthlyMetrics) {
      lines.push(
        `Month ${month.monthLabel}: income ${formatCurrency(month.totalIncome)}, expenses ${formatCurrency(month.totalExpenses)}, cashflow ${formatCurrency(month.netCashflow)}.`
      )
    }

    return lines.join("\n")
  }, [metrics, monthlyMetrics, transactions])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadWorkspace()
      setWorkspace(stored)
      setIsLoaded(true)

      if (getWorkspaceTransactions(stored).length === 0) {
        router.replace("/")
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [router])

  function loadSample() {
    const analysis = analyzeSampleCsvs("multi")
    const current = workspace ?? loadWorkspace()
    const next = appendAnalysisToStoredWorkspace(current, analysis)
    setImportErrors([])
    setWorkspace(next)
  }

  function handleImported(next: MoneyWorkspace) {
    setImportErrors([])
    setWorkspace(next)
  }

  function createNew() {
    clearMoneyMirrorData()
    router.push("/")
  }

  function toggleCategory(category: MoneyCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  if (!isLoaded || transactions.length === 0) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Money overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {transactions.length > 0
              ? `${transactions.length} transactions across ${monthlyMetrics.length} month${monthlyMetrics.length === 1 ? "" : "s"}.`
              : "Upload a CSV or load sample data."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ImportCsvButton onImported={handleImported} onError={setImportErrors} />
          <Button type="button" variant="secondary" onClick={loadSample}>
            <RefreshCw className="size-4" />
            Load sample
          </Button>
          <Button type="button" variant="outline" onClick={createNew}>
            <Plus className="size-4" />
            Create new
          </Button>
          <Button asChild>
            <Link href="/reports/current">
              <FileText className="size-4" />
              Report
            </Link>
          </Button>
        </div>
      </div>

      {importErrors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {importErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <>
          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Total income" value={formatCurrency(metrics.totalIncome)} tone="green" />
            <Metric label="Total expenses" value={formatCurrency(metrics.totalExpenses)} tone="dark" />
            <Metric label="Net cashflow" value={formatCurrency(metrics.netCashflow)} tone="gold" />
            <Metric label="Biggest category" value={metrics.biggestCategory} detail={formatCurrency(metrics.biggestCategoryAmount)} />
            <Metric label="Top money leak" value={metrics.topMoneyLeak} detail={formatCurrency(metrics.topMoneyLeakAmount)} />
          </section>

          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">Monthly comparison</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasComparison
                    ? hasCategoryFilter
                      ? `Showing ${selectedCategories.join(", ")} expenses by month.`
                      : "Income, expenses, and cashflow grouped by transaction month."
                    : "Upload another month to compare spending patterns."}
                </p>
              </div>
              <MonthlySuggestionsDialog
                monthLabel={latestMonth?.monthLabel}
                suggestions={monthlySuggestions}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={hasCategoryFilter ? "outline" : "secondary"}
                onClick={() => setSelectedCategories([])}
              >
                {!hasCategoryFilter ? <Check className="size-4" /> : null}
                All expenses
              </Button>
              {expenseFilterCategories.map((category) => {
                const checked = selectedCategories.includes(category)

                return (
                  <label
                    key={category}
                    className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      type="checkbox"
                      onChange={() => toggleCategory(category)}
                    />
                    {checked ? <Check className="size-4" /> : null}
                    {category}
                  </label>
                )
              })}
            </div>
            {hasCategoryFilter ? (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-muted-foreground">Filtered spend</p>
                  <p className="mt-1 font-semibold">{formatCurrency(filteredExpenseTotal)}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="mt-1 font-semibold">{filteredExpenseTransactions.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-muted-foreground">Selected</p>
                  <p className="mt-1 truncate font-semibold">{selectedCategories.join(", ")}</p>
                </div>
              </div>
            ) : null}
            {hasComparison ? (
              <ChartContainer config={activeChartConfig} className="mt-5 h-80 w-full">
                <BarChart data={monthlyChartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => formatCompactCurrency(Number(value))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex min-w-36 items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {activeChartConfig[String(name)]?.label ?? name}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {hasCategoryFilter ? (
                    selectedChartKeys.map((key) => (
                      <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]} />
                    ))
                  ) : (
                    <>
                      <Bar dataKey="totalIncome" fill="var(--color-totalIncome)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalExpenses" fill="var(--color-totalExpenses)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netCashflow" fill="var(--color-netCashflow)" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Current data has one month. Add one more CSV month to unlock the bar chart and category movement notes.
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">Spending by category</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Debits excluding transfers.</p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/reports/current">
                    Summary
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {filteredCategoryTotals.length === 0 ? (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    No matching category spend for the current filter.
                  </p>
                ) : (
                  filteredCategoryTotals.slice(0, 8).map((item) => (
                    <div key={item.category} className="grid gap-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(7, (item.amount / maxCategory) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-medium">Income vs expenses</h2>
              <p className="mt-1 text-sm text-muted-foreground">Current CSV data.</p>
              <div className="mt-6 space-y-5">
                <FlowBar label="Income" amount={metrics.totalIncome} max={maxFlow} className="bg-primary" />
                <FlowBar label="Expenses" amount={metrics.totalExpenses} max={maxFlow} className="bg-expense" />
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Cashflow read</p>
                  <p className="mt-2 text-xl font-semibold">
                    {metrics.netCashflow >= 0 ? "Positive" : "Negative"} {formatCurrency(metrics.netCashflow)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {report ? (
            <section className="mt-6 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-medium">What to cut first</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Practical recommendations from the current data.</p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/reports/current">
                    Full report
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {report.suggestions.map((suggestion) => (
                  <p key={suggestion} className="rounded-lg bg-muted p-3 text-sm leading-6">
                    {suggestion}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <TransactionTable title="Recent transactions" transactions={metrics.recentTransactions} />
            <TransactionTable title="Biggest transactions" transactions={metrics.biggestTransactions} />
          </section>

          <ChatPanel context={chatContext} />
      </>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail?: string
  tone?: "green" | "gold" | "dark"
}) {
  const toneClass =
    tone === "green"
      ? "bg-primary text-primary-foreground"
      : tone === "gold"
        ? "bg-accent text-accent-foreground"
        : tone === "dark"
          ? "bg-expense text-expense-foreground"
          : "bg-card"

  return (
    <div className={`rounded-lg border border-border p-4 ${toneClass}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold">{value}</p>
      {detail ? <p className="mt-2 text-sm opacity-75">{detail}</p> : null}
    </div>
  )
}

function getCategoryChartKey(category: MoneyCategory) {
  return `category_${category.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
}

function sumCategorySpend(transactions: MoneyTransaction[], month: string, category: MoneyCategory) {
  return transactions
    .filter((transaction) => transaction.amount < 0 && transaction.monthKey === month && transaction.category === category)
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0)
}

function FlowBar({
  label,
  amount,
  max,
  className,
}: {
  label: string
  amount: number
  max: number
  className: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{formatCurrency(amount)}</span>
      </div>
      <div className="h-10 rounded-lg bg-muted p-1">
        <div className={`h-full rounded-md ${className}`} style={{ width: `${Math.max(8, (amount / max) * 100)}%` }} />
      </div>
    </div>
  )
}

function TransactionTable({ title, transactions }: { title: string; transactions: MoneyTransaction[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-medium">{title}</h2>
      </div>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date}</TableCell>
              <TableCell className="max-w-48 whitespace-normal">{transaction.description}</TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
