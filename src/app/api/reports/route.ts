import { NextResponse } from "next/server"

import { buildMoneyReport, getMoneyMetrics, type MoneyTransaction } from "@/lib/moneymirror"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { transactions?: MoneyTransaction[] }
  const transactions = Array.isArray(body.transactions) ? body.transactions : []

  return NextResponse.json({
    metrics: getMoneyMetrics(transactions),
    report: buildMoneyReport(transactions),
  })
}
