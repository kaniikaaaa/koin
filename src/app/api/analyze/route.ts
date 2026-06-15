import { NextResponse } from "next/server"

import { categorizeTransactions, type MoneyTransaction } from "@/lib/moneymirror"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { transactions?: MoneyTransaction[] }
  const transactions = Array.isArray(body.transactions) ? body.transactions : []

  if (transactions.length === 0) {
    return NextResponse.json({ transactions: [], error: "No transactions supplied." }, { status: 400 })
  }

  return NextResponse.json({ transactions: categorizeTransactions(transactions) })
}
