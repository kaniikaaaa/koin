// Chat assistant endpoint. Calls OpenAI server-side so the API key never
// reaches the browser. The client posts the conversation + a finance summary
// and gets back a single assistant reply.

export const runtime = "nodejs"

type IncomingMessage = { role: "user" | "assistant"; content: string }

const DEFAULT_MODEL = "gpt-4o-mini"

const SYSTEM_PROMPT = `You are MoneyMirror, a concise and friendly personal-finance assistant built into a local-first finance tracker.
You help the user understand their spending, spot savings, and answer questions about the transactions they've uploaded.
Guidelines:
- Be specific and practical. Prefer short answers (a few sentences or a tight list).
- Ground every number in the financial summary provided below. Never invent transactions or figures.
- If the summary lacks the data needed to answer, say so briefly and suggest what to upload.
- Use the same currency formatting as the summary.`

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not set. Add it to your .env file and restart the dev server." },
      { status: 500 }
    )
  }

  let body: { messages?: IncomingMessage[]; context?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }))

  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 })
  }

  const systemContent = body.context
    ? `${SYSTEM_PROMPT}\n\nUser's financial summary:\n${body.context}`
    : `${SYSTEM_PROMPT}\n\n(No financial data has been uploaded yet.)`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || DEFAULT_MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [{ role: "system", content: systemContent }, ...messages],
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
    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      return Response.json({ error: "The model returned an empty response." }, { status: 502 })
    }

    return Response.json({ reply })
  } catch (error) {
    return Response.json(
      { error: "Could not reach the model. Check your network and API key.", detail: String(error) },
      { status: 502 }
    )
  }
}
