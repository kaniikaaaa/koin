import { createId } from "@/lib/money-id"
import { toMonthKey } from "@/lib/money-format"
import type { MoneyTransaction } from "@/lib/money-types"

export type ParsedMoneyCsv = {
  transactions: MoneyTransaction[]
  errors: string[]
}

export function parseMoneyCsv(csvText: string, statementId: string): ParsedMoneyCsv {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    return { transactions: [], errors: ["CSV needs a header row and at least one transaction row."] }
  }

  const headers = rows[0].map(normalizeHeader)
  const dateIndex = findHeader(headers, ["date", "transaction date", "txn date", "value date", "posted date"])
  const descriptionIndex = findHeader(headers, [
    "description",
    "narration",
    "details",
    "merchant",
    "particulars",
    "transaction details",
  ])
  const amountIndex = findHeader(headers, ["amount", "transaction amount", "amt"])
  const debitIndex = findHeader(headers, ["debit", "withdrawal", "withdrawals", "paid out"])
  const creditIndex = findHeader(headers, ["credit", "deposit", "deposits", "paid in"])

  const errors: string[] = []
  if (dateIndex < 0) errors.push("Could not find a date column.")
  if (descriptionIndex < 0) errors.push("Could not find a description column.")
  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) {
    errors.push("Could not find amount, debit, or credit columns.")
  }

  if (errors.length > 0) return { transactions: [], errors }

  const transactions = rows.slice(1).flatMap((row, index) => {
    const date = normalizeDate(row[dateIndex])
    const description = cleanText(row[descriptionIndex])
    const amount = amountIndex >= 0 ? parseAmount(row[amountIndex]) : parseDebitCredit(row[debitIndex], row[creditIndex])

    if (!date || !description || Number.isNaN(amount) || amount === 0) {
      errors.push(`Skipped row ${index + 2}: missing date, description, or non-zero amount.`)
      return []
    }

    const transaction: MoneyTransaction = {
      id: createId("txn"),
      statementId,
      date,
      monthKey: toMonthKey(date),
      description,
      merchant: normalizeMerchant(description),
      amount,
      type: amount > 0 ? "income" : "debit",
      category: amount > 0 ? "Income" : "Miscellaneous",
      confidence: amount > 0 ? 0.98 : 0.35,
      reason: amount > 0 ? "Positive amount treated as income" : "Waiting for categorization",
    }

    return [transaction]
  })

  return { transactions, errors }
}

export function normalizeMerchant(description: string) {
  const merchant = description
    .replace(/\b(payment|debit|credit|txn|transaction|upi|to|from|card|pos)\b/gi, "")
    .replace(/[^a-z0-9 ]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32)
    .toUpperCase()

  return merchant || "UNKNOWN MERCHANT"
}

function parseCsv(csvText: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index]
    const next = csvText[index + 1]

    if (char === '"' && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim())
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ")
}

function findHeader(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header))
}

function cleanText(value = "") {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeDate(value = "") {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const localMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (localMatch) {
    const [, first, second, rawYear] = localMatch
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    const secondNumber = Number(second)
    const month = secondNumber > 12 ? first : second
    const day = secondNumber > 12 ? second : first
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return trimmed
}

function parseAmount(value = "") {
  const trimmed = value.trim()
  const negativeByMarker = /^\(.*\)$/.test(trimmed) || /\bdr\b/i.test(trimmed)
  const normalized = trimmed.replace(/[(),]/g, "").replace(/\b(cr|dr)\b/gi, "").replace(/[^\d.-]/g, "")
  const amount = Number(normalized)
  if (Number.isNaN(amount)) return Number.NaN
  return negativeByMarker ? -Math.abs(amount) : amount
}

function parseDebitCredit(debit = "", credit = "") {
  const debitAmount = parseAmount(debit)
  const creditAmount = parseAmount(credit)
  if (!Number.isNaN(creditAmount) && creditAmount > 0) return Math.abs(creditAmount)
  if (!Number.isNaN(debitAmount) && debitAmount > 0) return -Math.abs(debitAmount)
  return Number.NaN
}
