"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  PieChart,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { AppShell } from "@/components/app-shell"
import { ChatPanel } from "@/components/chat-panel"
import { ImportCsvButton } from "@/components/import-csv-button"
import { MetricCard } from "@/components/metric-card"
import { SuggestionsPanel } from "@/components/suggestions-panel"
import { track } from "@/lib/analytics"
import { pendoTrack } from "@/lib/pendo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
]

const expenseFilterCategories = moneyCategories.filter(
  (category) => category !== "Income" && category !== "Refund"
)

export default function DashboardPage() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<MoneyWorkspace | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<MoneyCategory[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const transactions = useMemo(() => (workspace ? getWorkspaceTransactions(workspace) : []), [workspace])
  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])
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
      // Merchant-free: the leak is described by amount only, never the merchant
      // name, so no raw statement data leaves the browser for the AI features.
      `Top recurring leak: ${formatCurrency(metrics.topMoneyLeakAmount)} of repeated discretionary spend.`,
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
      const txns = getWorkspaceTransactions(stored)

      if (txns.length === 0) {
        router.replace("/")
      } else {
        track("dashboard_viewed")
        pendoTrack("dashboard_viewed", {
          transactionCount: txns.length,
          monthCount: new Set(txns.map((t) => t.monthKey)).size,
          statementCount: stored.statements.length,
        })
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
    track("sample_loaded")
    pendoTrack("sample_loaded", {
      mode: "multi",
      loadSource: "dashboard",
      transactionCount: getWorkspaceTransactions(next).length,
    })
  }

  function handleImported(next: MoneyWorkspace) {
    setImportErrors([])
    setWorkspace(next)
  }

  function createNew() {
    clearMoneyMirrorData()
    track("workspace_created")
    pendoTrack("workspace_created", {
      previousTransactionCount: transactions.length,
      previousStatementCount: workspace?.statements.length ?? 0,
      previousMonthCount: monthlyMetrics.length,
    })
    router.push("/")
  }

  function toggleCategory(category: MoneyCategory) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  if (!isLoaded) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    )
  }

  if (transactions.length === 0) {
    return null
  }

  const sidebarActions = (
    <>
      <ImportCsvButton
        className="w-full justify-start"
        onImported={handleImported}
        onError={setImportErrors}
      />
      <Button type="button" variant="secondary" className="w-full justify-start" onClick={loadSample}>
        <RefreshCw className="size-4" />
        Load sample
      </Button>
      <Button type="button" variant="outline" className="w-full justify-start" onClick={createNew}>
        <Plus className="size-4" />
        Create new
      </Button>
    </>
  )

  return (
    <AppShell actions={sidebarActions}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Money overview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {`${transactions.length} transactions across ${monthlyMetrics.length} month${monthlyMetrics.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      {importErrors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">We couldn&apos;t import that file</p>
          <div className="mt-1 space-y-0.5 text-destructive/90">
            {importErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
          <p className="mt-2 text-destructive/80">
            Make sure it has Date, Description, and Amount (or Debit/Credit) columns — or try Load sample.
          </p>
        </div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Total income" value={formatCurrency(metrics.totalIncome)} tone="green" icon={ArrowUpRight} />
            <MetricCard label="Total expenses" value={formatCurrency(metrics.totalExpenses)} tone="dark" icon={ArrowDownRight} />
            <MetricCard label="Net cashflow" value={formatCurrency(metrics.netCashflow)} tone="gold" icon={TrendingUp} />
            <MetricCard label="Biggest category" value={metrics.biggestCategory} detail={formatCurrency(metrics.biggestCategoryAmount)} icon={PieChart} />
            <MetricCard label="Top money leak" value={metrics.topMoneyLeak} detail={formatCurrency(metrics.topMoneyLeakAmount)} icon={TrendingDown} />
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
                    className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
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
                        <span className="font-mono tabular-nums text-muted-foreground">{formatCurrency(item.amount)}</span>
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
                  <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
                    {metrics.netCashflow >= 0 ? "Positive" : "Negative"} {formatCurrency(metrics.netCashflow)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <SuggestionsPanel
            monthLabel={latestMonth?.monthLabel}
            suggestions={monthlySuggestions}
            context={chatContext}
          />

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <TransactionTable title="Recent transactions" transactions={metrics.recentTransactions} />
            <TransactionTable title="Biggest transactions" transactions={metrics.biggestTransactions} />
          </section>

          <ChatPanel context={chatContext} />
    </AppShell>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <section className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </section>
      <Skeleton className="mt-6 h-80" />
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
        <span className="font-mono tabular-nums text-muted-foreground">{formatCurrency(amount)}</span>
      </div>
      <div className="h-10 rounded-lg bg-muted p-1">
        <div className={`h-full rounded-md ${className}`} style={{ width: `${Math.max(8, (amount / max) * 100)}%` }} />
      </div>
    </div>
  )
}

function AmountTag({ amount, className = "" }: { amount: number; className?: string }) {
  const positive = amount >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tabular-nums ${
        positive ? "text-positive" : "text-expense"
      } ${className}`}
    >
      <Icon className="size-3.5" />
      {formatCurrency(amount)}
    </span>
  )
}

function TransactionTable({ title, transactions }: { title: string; transactions: MoneyTransaction[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="font-medium">{title}</h2>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <Table>
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
                <TableCell className="font-mono text-xs text-muted-foreground">{transaction.date}</TableCell>
                <TableCell className="max-w-48 whitespace-normal">{transaction.description}</TableCell>
                <TableCell className="text-muted-foreground">{transaction.category}</TableCell>
                <TableCell className="text-right">
                  <AmountTag amount={transaction.amount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards — no horizontal scroll */}
      <ul className="divide-y divide-border md:hidden">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm">{transaction.description}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {transaction.date} · {transaction.category}
              </p>
            </div>
            <AmountTag amount={transaction.amount} className="shrink-0 text-sm" />
          </li>
        ))}
      </ul>
    </div>
  )
}
