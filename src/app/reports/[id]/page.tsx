"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BarChart3, FileText, RefreshCw, Upload } from "lucide-react"

import { MonthlySuggestionsDialog } from "@/components/monthly-suggestions-dialog"
import { Button } from "@/components/ui/button"
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
  formatCurrency,
  getMonthlyMetrics,
  getMoneyMetrics,
  getWorkspaceTransactions,
  type MoneyReport,
  type MoneyWorkspace,
} from "@/lib/moneymirror"
import { appendAnalysisToStoredWorkspace, loadWorkspace } from "@/lib/moneymirror-storage"

export default function ReportPage() {
  const [workspace, setWorkspace] = useState<MoneyWorkspace | null>(null)
  const transactions = useMemo(() => (workspace ? getWorkspaceTransactions(workspace) : []), [workspace])
  const report = useMemo<MoneyReport | null>(() => (transactions.length > 0 ? buildMoneyReport(transactions) : null), [transactions])
  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])
  const monthlyMetrics = useMemo(() => getMonthlyMetrics(transactions), [transactions])
  const latestMonth = monthlyMetrics.at(-1)
  const previousMonth = monthlyMetrics.at(-2)
  const monthlySuggestions = useMemo(
    () => buildMonthlySuggestions(latestMonth, previousMonth),
    [latestMonth, previousMonth]
  )
  const hasComparison = monthlyMetrics.length > 1

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkspace(loadWorkspace())
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function loadSampleReport() {
    const analysis = analyzeSampleCsvs("multi")
    const current = workspace ?? loadWorkspace()
    const next = appendAnalysisToStoredWorkspace(current, analysis)
    setWorkspace(next)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Report</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Current money summary</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A concise finance readout based on the categorized local data.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/upload">
              <Upload className="size-4" />
              Upload
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <BarChart3 className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button type="button" onClick={loadSampleReport}>
            <RefreshCw className="size-4" />
            Sample report
          </Button>
        </div>
      </div>

      {!report ? (
        <section className="mt-8 grid min-h-96 place-items-center rounded-lg border border-border bg-card p-8 text-center">
          <div>
            <FileText className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">No report generated</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Analyze transactions from the upload page, or load the sample report.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button asChild>
                <Link href="/upload">Upload CSV</Link>
              </Button>
              <Button type="button" variant="outline" onClick={loadSampleReport}>
                Load sample
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="size-5" />
              <span className="text-sm font-medium">Generated summary</span>
            </div>
            <p className="mt-5 text-2xl font-semibold leading-10">{report.summary}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SmallMetric label="Income" value={formatCurrency(metrics.totalIncome)} />
              <SmallMetric label="Expenses" value={formatCurrency(metrics.totalExpenses)} />
              <SmallMetric label="Cashflow" value={formatCurrency(metrics.netCashflow)} />
            </div>
          </section>

          <section className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {report.insights.map((insight) => (
                <div key={insight.label} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{insight.label}</p>
                  <p className="mt-2 break-words text-xl font-semibold">{insight.value}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{insight.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-medium">Saving suggestions</h2>
              <div className="mt-4 grid gap-3">
                {report.suggestions.map((suggestion) => (
                  <p key={suggestion} className="rounded-lg bg-muted p-3 text-sm leading-6">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-medium">Top merchants</h2>
              <div className="mt-4 grid gap-3">
                {metrics.merchantTotals.length === 0 ? (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Analyze debit transactions to populate merchant totals.
                  </p>
                ) : (
                  metrics.merchantTotals.slice(0, 5).map((merchant) => (
                    <div key={merchant.merchant} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                      <span className="font-medium">{merchant.merchant}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(merchant.amount)} / {merchant.count}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h2 className="font-medium">Monthly report table</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One row per calendar month across all uploaded CSV statements.
                </p>
              </div>
              <MonthlySuggestionsDialog
                monthLabel={latestMonth?.monthLabel}
                suggestions={monthlySuggestions}
              />
            </div>
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Cashflow</TableHead>
                  <TableHead>Biggest category</TableHead>
                  <TableHead>Top leak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyMetrics.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.monthLabel}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.totalIncome)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.totalExpenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(month.netCashflow)}</TableCell>
                    <TableCell>
                      {month.biggestCategory} ({formatCurrency(month.biggestCategoryAmount)})
                    </TableCell>
                    <TableCell>
                      {month.topMoneyLeak} ({formatCurrency(month.topMoneyLeakAmount)})
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!hasComparison ? (
              <div className="border-t border-border p-4 text-sm text-muted-foreground">
                Add another month of CSV data to compare categories, warnings, and appreciation notes.
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold">{value}</p>
    </div>
  )
}
