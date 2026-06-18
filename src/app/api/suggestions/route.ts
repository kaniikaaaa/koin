// AI money-tip generator. Given a finance summary it returns structured tips
// (JSON) used by the monthly suggestions carousel. Runs server-side so the
// OpenAI key stays out of the browser.

export const runtime = "nodejs"

const DEFAULT_MODEL = "gpt-4o-mini"

const SYSTEM_PROMPT = `You are MoneyMirror, a practical personal-finance coach. Given a summary of the user's spending, produce specific, actionable money tips.

Rules:
- Return AT LEAST 3 and at most 5 tips.
- Prioritize cutting DISCRETIONARY spend: subscriptions, shopping, travel, food delivery, miscellaneous. NEVER suggest cutting fixed costs like rent, EMIs, bills, taxes, or investments — call those out as "not worth cutting first" if relevant.
- Each tip has: "tone" (one of "suggestion", "appreciation", "warning"), a short "title" (2-4 words), a "detail" (1-2 sentences with a concrete action), and an optional "value" (a short rupee amount or metric, e.g. "₹2,000/mo").
- Ground every number in the summary. Do not invent transactions or figures.
- Include at least one "appreciation" tip when the data shows good behavior (positive cashflow, rising investment, a category that dropped).
- Be concise and India-context friendly (₹, SIP, index funds).

Respond ONLY with JSON in this exact shape:
{"tips":[{"tone":"suggestion","title":"...","detail":"...","value":"..."}]}`

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set. Add it to your .env file and restart the dev server." },
      { status: 500 }
    )
  }

  let body: { context?: string; monthLabel?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const context = typeof body.context === "string" ? body.context : ""
  const monthLabel = typeof body.monthLabel === "string" ? body.monthLabel : ""
  const userContent = `Month: ${monthLabel || "latest"}\n\nFinancial summary:\n${context || "No financial data provided."}`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || DEFAULT_MODEL,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return Response.json(
        { error: `The model request failed (${response.status}).`, detail },
        { status: 502 }
      )
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content

    let parsed: { tips?: unknown }
    try {
      parsed = JSON.parse(raw)
    } catch {
      return Response.json({ error: "The model returned malformed output." }, { status: 502 })
    }

    const tips = Array.isArray(parsed.tips) ? parsed.tips : []
    if (tips.length === 0) {
      return Response.json({ error: "No tips were generated." }, { status: 502 })
    }

    return Response.json({ tips })
  } catch (error) {
    return Response.json(
      { error: "Could not reach the model. Check your network and API key.", detail: String(error) },
      { status: 502 }
    )
  }
}
