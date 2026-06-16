"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { ArrowRight, BarChart3, FileText, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  analyzeMoneyCsv,
  analyzeMoneyCsvFiles,
  analyzeSampleCsvs,
  formatCurrency,
  formatPercent,
  getMoneyMetrics,
  getMonthlyMetrics,
  getWorkspaceTransactions,
  moneyCategories,
  removeWorkspaceTransaction,
  sampleCsv,
  sampleCsvStatements,
  updateWorkspaceTransactionCategory,
  type MoneyAnalysisResult,
  type MoneyCategory,
  type MoneyFilesAnalysisResult,
  type MoneyWorkspace,
} from "@/lib/moneymirror"
import {
  appendAnalysisToStoredWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "@/lib/moneymirror-storage"

export default function UploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv)
  const [fileName, setFileName] = useState(sampleCsvStatements[0].fileName)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [workspace, setWorkspace] = useState<MoneyWorkspace | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState("Sample CSV is ready.")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadWorkspace()
      const storedTransactions = getWorkspaceTransactions(stored)
      setWorkspace(stored)
      if (storedTransactions.length > 0) {
        setStatus(`${storedTransactions.length} saved transactions loaded from ${stored.statements.length} statement${stored.statements.length === 1 ? "" : "s"}.`)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const transactions = useMemo(() => (workspace ? getWorkspaceTransactions(workspace) : []), [workspace])
  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])
  const monthlyMetrics = useMemo(() => getMonthlyMetrics(transactions), [transactions])

  function appendAnalysis(analysis: MoneyAnalysisResult | MoneyFilesAnalysisResult, sourceName: string) {
    const currentWorkspace = workspace ?? loadWorkspace()
    const next = appendAnalysisToStoredWorkspace(currentWorkspace, analysis)
    const nextTransactions = getWorkspaceTransactions(next)
    const statements = "statement" in analysis ? [analysis.statement] : analysis.statements

    setWorkspace(next)
    setErrors(analysis.errors)
    setStatus(
      `${statements.length} statement${statements.length === 1 ? "" : "s"} added from ${sourceName}. ${nextTransactions.length} total transactions are ready.`
    )
  }

  function analyzeCsv(text = csvText, sourceName = fileName) {
    const result = analyzeMoneyCsv(text, sourceName)
    appendAnalysis(result, sourceName)
  }

  function analyzeSample(mode: "single" | "multi") {
    const result = analyzeSampleCsvs(mode)
    setCsvText(mode === "single" ? sampleCsvStatements[0].csvText : sampleCsvStatements.map((sample) => sample.csvText).join("\n\n"))
    setFileName(mode === "single" ? sampleCsvStatements[0].fileName : "two sample CSVs")
    setPendingFiles([])
    appendAnalysis(result, mode === "single" ? "single-month sample" : "multi-month sample")
  }

  async function analyzeSelectedCsvs() {
    if (pendingFiles.length === 0) {
      analyzeCsv()
      return
    }

    const result = await analyzeMoneyCsvFiles(pendingFiles)
    appendAnalysis(
      result,
      pendingFiles.length === 1 ? pendingFiles[0].name : `${pendingFiles.length} files`
    )
    setPendingFiles([])
  }

  function updateCategory(id: string, category: MoneyCategory) {
    if (!workspace) return
    const next = updateWorkspaceTransactionCategory(workspace, id, category)
    setWorkspace(next)
    saveWorkspace(next)
    setStatus("Category edit saved.")
  }

  function removeTransaction(id: string) {
    if (!workspace) return
    const next = removeWorkspaceTransaction(workspace, id)
    setWorkspace(next)
    saveWorkspace(next)
    setStatus("Transaction removed.")
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    setPendingFiles(files)
    setFileName(files.length === 1 ? files[0].name : `${files.length} CSV files`)
    if (files.length === 1) setCsvText(await files[0].text())
    setErrors([])
    setStatus(`${files.length} CSV file${files.length === 1 ? "" : "s"} selected.`)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Upload</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">CSV workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add one statement or many. Everything stays in this browser.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Input</h2>
                <p className="mt-1 text-sm text-muted-foreground">{status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => analyzeSample("single")}>
                  <RefreshCw className="size-4" />
                  Single sample
                </Button>
                <Button type="button" variant="secondary" onClick={() => analyzeSample("multi")}>
                  <Sparkles className="size-4" />
                  Multi sample
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <Input accept=".csv,text/csv" multiple type="file" onChange={handleFileChange} />
              <textarea
                className="min-h-64 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-6 text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={analyzeSelectedCsvs} disabled={pendingFiles.length === 0 && csvText.trim().length === 0}>
                  <Upload className="size-4" />
                  {pendingFiles.length > 1 ? "Analyze CSVs" : "Analyze CSV"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/dashboard">
                    Open dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {errors.length > 0 ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Income" value={formatCurrency(metrics.totalIncome)} />
            <Metric label="Expenses" value={formatCurrency(metrics.totalExpenses)} />
            <Metric label="Cashflow" value={formatCurrency(metrics.netCashflow)} />
          </div>

          {transactions.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Statements" value={`${workspace?.statements.length ?? 0}`} muted />
                <Metric label="Months" value={`${monthlyMetrics.length}`} muted />
                <Metric label="Rows" value={`${transactions.length}`} muted />
              </div>
              {monthlyMetrics.length < 2 ? (
                <p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                  Add another month to unlock comparison charts and month-on-month notes.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="font-medium">Transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactions.length} analyzed rows. Biggest category: {metrics.biggestCategory}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <BarChart3 className="size-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports/current">
                  <FileText className="size-4" />
                  Report
                </Link>
              </Button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="grid min-h-96 place-items-center p-6 text-center">
              <div>
                <Sparkles className="mx-auto size-9 text-primary" />
                <p className="mt-3 font-medium">No parsed transactions yet</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  Start with a sample or upload bank statement CSVs.
                </p>
              </div>
            </div>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell className="max-w-52 whitespace-normal">{transaction.description}</TableCell>
                    <TableCell className="max-w-44 whitespace-normal text-muted-foreground">{transaction.merchant}</TableCell>
                    <TableCell className={transaction.amount >= 0 ? "text-right text-primary" : "text-right"}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 min-w-36 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                        value={transaction.category}
                        onChange={(event) => updateCategory(transaction.id, event.target.value as MoneyCategory)}
                      >
                        {moneyCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>{formatPercent(transaction.confidence)}</TableCell>
                    <TableCell>
                      <Button
                        aria-label={`Remove ${transaction.description}`}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                        onClick={() => removeTransaction(transaction.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={muted ? "rounded-lg bg-background p-3" : "rounded-lg border border-border bg-card p-4"}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold">{value}</p>
    </div>
  )
}
