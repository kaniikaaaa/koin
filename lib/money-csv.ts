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
    "transaction remarks",
    "remarks",
  ])
  // "amount" must not capture a withdrawal/deposit column — real bank exports name
  // those "Withdrawal Amount (INR )", "Deposit Amt." etc., which belong to debit/credit.
  const amountIndex = findHeader(
    headers,
    ["amount", "transaction amount", "amt"],
    ["withdrawal", "deposit", "debit", "credit", "paid"]
  )
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

function findHeader(headers: string[], candidates: string[], exclude: string[] = []) {
  // Prefer an exact header match, then fall back to a substring match so verbose
  // real-world headers ("Withdrawal Amount (INR )") still resolve. `exclude` keeps
  // the generic "amount" match from stealing a debit/credit column.
  const exact = headers.findIndex((header) => candidates.includes(header))
  if (exact >= 0) return exact

  return headers.findIndex(
    (header) =>
      !exclude.some((token) => header.includes(token)) &&
      candidates.some((candidate) => header.includes(candidate))
  )
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
    // An invalid month/day in an otherwise-structured date means skip the row,
    // not keep a malformed string that becomes a phantom "2026-13" month bucket.
    return formatYmd(year, month, day) ?? ""
  }

  const localMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (localMatch) {
    const [, first, second, rawYear] = localMatch
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    const secondNumber = Number(second)
    const month = secondNumber > 12 ? first : second
    const day = secondNumber > 12 ? second : first
    // An invalid month/day in an otherwise-structured date means skip the row,
    // not keep a malformed string that becomes a phantom "2026-13" month bucket.
    return formatYmd(year, month, day) ?? ""
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    // Format from LOCAL components — round-tripping a textual date through
    // toISOString() shifts it back a day in positive-offset zones (IST),
    // pushing 1st-of-month rows into the previous month.
    return (
      formatYmd(
        String(parsed.getFullYear()),
        String(parsed.getMonth() + 1),
        String(parsed.getDate())
      ) ?? trimmed
    )
  }

  return trimmed
}

// Build a YYYY-MM-DD string, rejecting impossible month/day values so a malformed
// date never creates a phantom "2026-13" month bucket downstream.
function formatYmd(year: string, month: string, day: string) {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`
}

function parseAmount(value = "") {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN

  const negativeByMarker = /^\(.*\)$/.test(trimmed) || /\bdr\b/i.test(trimmed)
  // Strip thousands separators, then pull the first numeric token. Matching the
  // token (instead of deleting non-digits) keeps a currency prefix's abbreviation
  // dot — e.g. "Rs.2,00,000" — from being misread as a decimal point (-> 0.2).
  const match = trimmed.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)
  if (!match) return Number.NaN

  const amount = Number(match[0])
  if (Number.isNaN(amount)) return Number.NaN
  return negativeByMarker ? -Math.abs(amount) : amount
}

function parseDebitCredit(debit = "", credit = "") {
  const debitAmount = parseAmount(debit)
  const creditAmount = parseAmount(credit)
  // A credit is a deposit (income); a debit is a withdrawal (expense). Use either
  // column whenever it holds a non-zero value, regardless of its sign — some banks
  // print withdrawals as negative in a single signed column.
  if (!Number.isNaN(creditAmount) && creditAmount !== 0) return Math.abs(creditAmount)
  if (!Number.isNaN(debitAmount) && debitAmount !== 0) return -Math.abs(debitAmount)
  return Number.NaN
}
