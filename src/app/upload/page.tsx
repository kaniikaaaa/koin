"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import { ArrowRight, FileText, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react"

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
  buildMoneyReport,
  categorizeTransactions,
  formatCurrency,
  formatPercent,
  getMoneyMetrics,
  moneyCategories,
  parseMoneyCsv,
  sampleCsv,
  type MoneyCategory,
  type MoneyTransaction,
} from "@/lib/moneymirror"
import { loadTransactions, saveReport, saveTransactions } from "@/lib/moneymirror-storage"

export default function UploadPage() {
  const [csvText, setCsvText] = useState(sampleCsv)
  const [fileName, setFileName] = useState("sample-transactions.csv")
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState("Sample data is ready.")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadTransactions()
      if (stored.length > 0) {
        setTransactions(stored)
        setStatus(`${stored.length} saved transactions loaded.`)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const metrics = useMemo(() => getMoneyMetrics(transactions), [transactions])

  function parseCsv() {
    const result = parseMoneyCsv(csvText)
    setErrors(result.errors)
    setTransactions(result.transactions)

    if (result.transactions.length > 0) {
      saveTransactions(result.transactions)
      saveReport(buildMoneyReport(result.transactions))
      setStatus(
        `${result.transactions.length} transactions normalized from ${fileName}.${
          result.errors.length > 0
            ? ` ${result.errors.length} rows need review. Run Analyze to categorize the saved rows.`
            : " Run Analyze to categorize spending."
        }`
      )
    } else {
      setStatus("No transactions were saved.")
    }
  }

  function analyzeTransactions() {
    const analyzed = categorizeTransactions(transactions)
    setTransactions(analyzed)
    saveTransactions(analyzed)
    saveReport(buildMoneyReport(analyzed))
    setStatus(`${analyzed.length} transactions categorized and saved.`)
  }

  function updateCategory(id: string, category: MoneyCategory) {
    const next = transactions.map((transaction) => {
      const type: MoneyTransaction["type"] =
        category === "Income" ? "income" : category === "Transfers" ? "transfer" : "debit"

      return transaction.id === id
        ? {
            ...transaction,
            category,
            confidence: 1,
            reason: "Manually edited by user",
            type,
          }
        : transaction
    })

    setTransactions(next)
    saveTransactions(next)
    setStatus("Category edit saved.")
  }

  function removeTransaction(id: string) {
    const next = transactions.filter((transaction) => transaction.id !== id)
    setTransactions(next)
    saveTransactions(next)
    setStatus("Transaction removed.")
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    setFileName(file.name)
    setCsvText(text)
    setErrors([])
    setStatus(`${file.name} loaded. Parse it when ready.`)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Upload</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">CSV transaction intake</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Normalize a statement into MoneyMirror transactions, then analyze categories and save the workspace locally.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">Statement file</h2>
                <p className="mt-1 text-sm text-muted-foreground">{status}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCsvText(sampleCsv)
                  setFileName("sample-transactions.csv")
                  setErrors([])
                  setStatus("Sample CSV loaded.")
                }}
              >
                <RefreshCw className="size-4" />
                Sample CSV
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              <Input accept=".csv,text/csv" type="file" onChange={handleFileChange} />
              <textarea
                className="min-h-64 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-6 outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={parseCsv}>
                  <Upload className="size-4" />
                  Parse CSV
                </Button>
                <Button type="button" variant="secondary" onClick={analyzeTransactions} disabled={transactions.length === 0}>
                  <Sparkles className="size-4" />
                  Analyze categories
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
            <Metric label="Net cashflow" value={formatCurrency(metrics.netCashflow)} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="font-medium">Transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {transactions.length} normalized rows. Biggest category: {metrics.biggestCategory}.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/reports/current">
                <FileText className="size-4" />
                Report
              </Link>
            </Button>
          </div>
          {transactions.length === 0 ? (
            <div className="grid min-h-96 place-items-center p-6 text-center">
              <div>
                <Sparkles className="mx-auto size-9 text-primary" />
                <p className="mt-3 font-medium">No parsed transactions yet</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  Parse the sample CSV or upload a bank statement export.
                </p>
              </div>
            </div>
          ) : (
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
