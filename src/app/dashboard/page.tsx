"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, FileText, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
  createMoneyWorkspace,
  formatCompactCurrency,
  formatCurrency,
  getMonthlyMetrics,
  getMoneyMetrics,
  getWorkspaceTransactions,
  type MoneyTransaction,
  type MoneyWorkspace,
} from "@/lib/moneymirror"
import {
  clearMoneyMirrorData,
  appendAnalysisToStoredWorkspace,
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

export default function DashboardPage() {
  const [workspace, setWorkspace] = useState<MoneyWorkspace | null>(null)
  const transactions = useMemo(() => (workspace ? getWorkspaceTransactions(workspace) : []), [workspace])
  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])
  const report = useMemo(() => (transactions.length > 0 ? buildMoneyReport(transactions) : null), [transactions])
  const monthlyMetrics = useMemo(() => getMonthlyMetrics(transactions), [transactions])
  const latestMonth = monthlyMetrics.at(-1)
  const previousMonth = monthlyMetrics.at(-2)
  const monthlySuggestions = useMemo(
    () => buildMonthlySuggestions(latestMonth, previousMonth),
    [latestMonth, previousMonth]
  )
  const hasComparison = monthlyMetrics.length > 1
  const maxCategory = Math.max(...metrics.categoryTotals.map((item) => item.amount), 1)
  const maxFlow = Math.max(metrics.totalIncome, metrics.totalExpenses, 1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkspace(loadWorkspace())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function loadSample() {
    const analysis = analyzeSampleCsvs("multi")
    const current = workspace ?? loadWorkspace()
    const next = appendAnalysisToStoredWorkspace(current, analysis)
    setWorkspace(next)
  }

  function clearData() {
    clearMoneyMirrorData()
    setWorkspace(createMoneyWorkspace())
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
              : "Upload a CSV or load the sample workspace."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/upload">
              <Upload className="size-4" />
              Upload CSV
            </Link>
          </Button>
          <Button type="button" variant="secondary" onClick={loadSample}>
            <RefreshCw className="size-4" />
            Load sample
          </Button>
          <Button asChild>
            <Link href="/reports/current">
              <FileText className="size-4" />
              Report
            </Link>
          </Button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <section className="mt-8 grid min-h-96 place-items-center rounded-lg border border-border bg-card p-8 text-center">
          <div>
            <Sparkles className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">No money data yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Start from the upload page, or load the sample set to view the demo dashboard.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button asChild>
                <Link href="/upload">Upload CSV</Link>
              </Button>
              <Button type="button" variant="outline" onClick={loadSample}>
                Load sample
              </Button>
            </div>
          </div>
        </section>
      ) : (
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
                    ? "Income, expenses, and cashflow grouped by transaction month."
                    : "Upload another month to compare spending patterns."}
                </p>
              </div>
              <MonthlySuggestionsDialog
                monthLabel={latestMonth?.monthLabel}
                suggestions={monthlySuggestions}
              />
            </div>
            {hasComparison ? (
              <ChartContainer config={monthlyChartConfig} className="mt-5 h-80 w-full">
                <BarChart data={monthlyMetrics} accessibilityLayer>
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
                              {monthlyChartConfig[name as keyof typeof monthlyChartConfig]?.label ?? name}
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
                  <Bar dataKey="totalIncome" fill="var(--color-totalIncome)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpenses" fill="var(--color-totalExpenses)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netCashflow" fill="var(--color-netCashflow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Current workspace has one month. Add one more CSV month to unlock the bar chart and category movement notes.
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
                {metrics.categoryTotals.length === 0 ? (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Analyze debit transactions to populate category spend.
                  </p>
                ) : (
                  metrics.categoryTotals.slice(0, 8).map((item) => (
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
              <p className="mt-1 text-sm text-muted-foreground">Current CSV workspace.</p>
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
                  <p className="mt-1 text-sm text-muted-foreground">Practical recommendations from the current workspace.</p>
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

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="destructive" onClick={clearData}>
              <Trash2 className="size-4" />
              Delete workspace
            </Button>
          </div>
        </>
      )}
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
