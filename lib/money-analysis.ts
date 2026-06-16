import { categorizeTransactions } from "@/lib/money-categorizer"
import { parseMoneyCsv } from "@/lib/money-csv"
import { createId } from "@/lib/money-id"
import { buildMoneyReport } from "@/lib/money-insights"
import { sampleCsvStatements } from "@/lib/money-samples"
import {
  createMoneyStatement,
  indexTransactions,
} from "@/lib/money-workspace"
import type { MoneyAnalysisResult, MoneyFilesAnalysisResult } from "@/lib/money-types"

type CsvTextInput = {
  fileName: string
  csvText: string
}

export function analyzeMoneyCsv(csvText: string, fileName = "pasted-transactions.csv"): MoneyAnalysisResult {
  const statementId = createId("statement")
  const parsed = parseMoneyCsv(csvText, statementId)
  const transactions = categorizeTransactions(parsed.transactions)
  const statement = createMoneyStatement(fileName, transactions, parsed.errors, "csv", statementId)
  const transactionsById = indexTransactions(transactions)

  return {
    statement,
    transactions,
    transactionsById,
    errors: parsed.errors,
    report: buildMoneyReport(transactions),
  }
}

export async function analyzeMoneyCsvFiles(files: File[]): Promise<MoneyFilesAnalysisResult> {
  const inputs = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name || "transactions.csv",
      csvText: await file.text(),
    }))
  )

  return analyzeMoneyCsvTexts(inputs)
}

export function analyzeMoneyCsvTexts(inputs: CsvTextInput[]): MoneyFilesAnalysisResult {
  const analyses = inputs.map((input) => analyzeMoneyCsv(input.csvText, input.fileName))
  const transactions = analyses.flatMap((analysis) => analysis.transactions)
  const statements = analyses.map((analysis) => analysis.statement)
  const transactionsById = Object.assign({}, ...analyses.map((analysis) => analysis.transactionsById))

  return {
    statements,
    transactions,
    transactionsById,
    errors: analyses.flatMap((analysis) =>
      analysis.errors.map((error) => `${analysis.statement.fileName}: ${error}`)
    ),
  }
}

export function analyzeSampleCsvs(mode: "single" | "multi" = "multi") {
  const inputs = mode === "single" ? sampleCsvStatements.slice(0, 1) : sampleCsvStatements
  return analyzeMoneyCsvTexts(inputs)
}
