import { NextResponse } from "next/server"

import { parseMoneyCsv } from "@/lib/moneymirror"

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  let csvText = ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const file = formData.get("file")
    csvText = typeof file === "string" ? file : await file?.text() ?? ""
  } else {
    const body = (await request.json().catch(() => ({}))) as { csv?: string }
    csvText = body.csv ?? ""
  }

  const result = parseMoneyCsv(csvText)
  return NextResponse.json(result, { status: result.errors.length > 0 ? 400 : 200 })
}
