"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowDownRight, ArrowUpRight, FileText, Lightbulb, RefreshCw, Store, TrendingUp } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { MetricCard } from "@/components/metric-card"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics"
import { pendoTrack } from "@/lib/pendo"
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
  const hasComparison = monthlyMetrics.length > 1

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ws = loadWorkspace()
      setWorkspace(ws)
      track("report_viewed")
      const txns = getWorkspaceTransactions(ws)
      pendoTrack("report_viewed", {
        transactionCount: txns.length,
        monthCount: new Set(txns.map((t) => t.monthKey)).size,
        hasData: txns.length > 0,
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function loadSampleReport() {
    const analysis = analyzeSampleCsvs("multi")
    const current = workspace ?? loadWorkspace()
    const next = appendAnalysisToStoredWorkspace(current, analysis)
    setWorkspace(next)
  }

  const sidebarActions = (
    <Button type="button" variant="secondary" className="w-full justify-start" onClick={loadSampleReport}>
      <RefreshCw className="size-4" />
      Load sample
    </Button>
  )

  return (
    <AppShell actions={sidebarActions}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Report</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Current money summary</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your private money readout — generated here, on your device.
        </p>
      </div>

      {report ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Income" value={formatCurrency(metrics.totalIncome)} tone="green" icon={ArrowUpRight} />
          <MetricCard label="Expenses" value={formatCurrency(metrics.totalExpenses)} tone="dark" icon={ArrowDownRight} />
          <MetricCard label="Net cashflow" value={formatCurrency(metrics.netCashflow)} tone="gold" icon={TrendingUp} />
        </section>
      ) : null}

      {!report ? (
        <section className="mt-8 grid min-h-96 place-items-center rounded-lg border border-border bg-card p-8 text-center">
          <div>
            <FileText className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">No report generated</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Analyze transactions from the home page, or load the sample report.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button asChild>
                <Link href="/">Upload CSV</Link>
              </Button>
              <Button type="button" variant="outline" onClick={loadSampleReport}>
                Load sample
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-8 space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="size-5" />
              Generated summary
            </h2>
            <p className="mt-4 max-w-4xl text-2xl font-semibold leading-9">{report.summary}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            {report.insights.map((insight) => (
              <div key={insight.label} className="rounded-lg border border-border bg-card p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{insight.label}</p>
                <p className="mt-2 break-words font-mono text-xl font-semibold tabular-nums">{insight.value}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{insight.detail}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Lightbulb className="size-4 text-primary" />
                Saving suggestions
              </h2>
              <div className="mt-4 grid gap-3">
                {report.suggestions.map((suggestion) => (
                  <p key={suggestion} className="rounded-lg bg-muted p-3 text-sm leading-6">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Store className="size-4 text-primary" />
                Top merchants
              </h2>
              <div className="mt-4 grid gap-3">
                {metrics.merchantTotals.length === 0 ? (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Analyze debit transactions to populate merchant totals.
                  </p>
                ) : (
                  metrics.merchantTotals.slice(0, 5).map((merchant) => (
                    <div key={merchant.merchant} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                      <span className="font-medium">{merchant.merchant}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatCurrency(merchant.amount)} / {merchant.count}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-medium">Monthly report table</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One row per calendar month across all uploaded CSV statements.
              </p>
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
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
                      <TableCell className="text-right font-mono tabular-nums text-positive">
                        {formatCurrency(month.totalIncome)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-expense">
                        {formatCurrency(month.totalExpenses)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-accent">
                        {formatCurrency(month.netCashflow)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {month.biggestCategory} ({formatCurrency(month.biggestCategoryAmount)})
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {month.topMoneyLeak} ({formatCurrency(month.topMoneyLeakAmount)})
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards — no horizontal scroll */}
            <ul className="divide-y divide-border md:hidden">
              {monthlyMetrics.map((month) => (
                <li key={month.month} className="space-y-2 p-4">
                  <p className="font-medium">{month.monthLabel}</p>
                  <dl className="grid grid-cols-3 gap-2">
                    <div>
                      <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Income</dt>
                      <dd className="font-mono text-sm tabular-nums text-positive">{formatCurrency(month.totalIncome)}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expenses</dt>
                      <dd className="font-mono text-sm tabular-nums text-expense">{formatCurrency(month.totalExpenses)}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Cashflow</dt>
                      <dd className="font-mono text-sm tabular-nums text-accent">{formatCurrency(month.netCashflow)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted-foreground">
                    Top leak: {month.topMoneyLeak} ({formatCurrency(month.topMoneyLeakAmount)})
                  </p>
                </li>
              ))}
            </ul>
            {!hasComparison ? (
              <div className="border-t border-border p-4 text-sm text-muted-foreground">
                Add another month of CSV data to compare categories, warnings, and appreciation notes.
              </div>
            ) : null}
          </section>
        </div>
      )}
    </AppShell>
  )
}
