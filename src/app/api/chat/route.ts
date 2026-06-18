// Chat assistant endpoint. Calls OpenAI server-side so the API key never
// reaches the browser. The client posts the conversation + a finance summary
// and gets back a single assistant reply.

export const runtime = "nodejs"

type IncomingMessage = { role: "user" | "assistant"; content: string }

const DEFAULT_MODEL = "gpt-4o-mini"

const SYSTEM_PROMPT = `You are MoneyMirror, a personal-finance assistant built into a local-first finance tracker. You ONLY help with the user's money: understanding their uploaded transactions, spending categories, budgeting, saving, and general personal-finance education.

## Scope
You help with anything about the user's personal finances. This is BROAD — all of these are IN scope and you should answer them helpfully:
- Their uploaded transactions, spending categories, trends, and cashflow.
- Budgeting, saving more, cutting expenses, and money habits — even general tips that don't reference the uploaded data.
- General personal-finance education: how SIPs / index funds / emergency funds work, LEGAL tax-saving and tax planning, and basic investing concepts.
Only treat a question as OUT of scope if it is clearly unrelated to money or finance (e.g. coding, trivia, geography, health, relationships, general chit-chat).

## Refusing
- Clearly off-topic (non-finance): politely decline in ONE line and steer back, e.g. "I can only help with your finances — try asking about your spending or savings." Do not answer the off-topic part.
- Gambling, betting, lottery, or genuinely illegal money activity (tax EVASION, money laundering, fraud, hiding income from authorities): firmly refuse, give NO instructions, and offer a legal finance alternative. Note: legal tax-SAVING and tax planning are fine and in scope — only refuse clearly illegal evasion.
- When in doubt, ANSWER. Most money questions are in scope; refuse only when a request is clearly off-topic or clearly unsafe. Never refuse a genuine saving, budgeting, or tax-planning question just because the uploaded data doesn't cover it.

## Answering (optimise around categories)
- Ground every number in the financial summary below. Never invent transactions or figures.
- When suggesting cuts, prioritise DISCRETIONARY categories (Subscriptions, Shopping, Travel, Food, Misc) and never tell the user to cut fixed costs like Rent, Bills, EMIs, or Investments.
- When relevant, structure answers by category: a short intro, then a tight bullet list (category → amount → one action). Keep replies to a few sentences or a small list.
- Use the same currency formatting as the summary (₹).

## Boundaries
- You are not a licensed financial advisor; frame tips as general education, not personalised investment advice. No specific stock or crypto buy/sell calls.
- If the summary lacks the data needed to answer, say so briefly and suggest what to upload.`

// Hard refusal for gambling / illegal asks. A system prompt alone is only a
// "polite request" the model can be talked out of, so we also screen the user's
// message here and short-circuit before reaching the model.
const DISALLOWED_PATTERNS: RegExp[] = [
  /\b(gambl(e|ing|er)|betting|sports\s*bet|casino|poker|roulette|blackjack|lottery|satta|teen\s?patti|slot\s+machines?|wager(s|ing)?)\b/i,
  /\b(money\s+launder\w*|launder\w*\s+money|tax\s+evasion|evad\w*\s+(tax|taxes)|hide\s+(income|money)\s+from\s+(tax|taxes|the\s+government|government)|hawala|ponzi|insider\s+trading|counterfeit\s+(money|cash|currency))\b/i,
]

const DISALLOWED_REPLY =
  "I can't help with gambling or anything illegal. If it's useful, I can help you budget, cut discretionary spending, or plan savings from the transactions you've uploaded."

function isDisallowed(text: string) {
  return DISALLOWED_PATTERNS.some((pattern) => pattern.test(text))
}

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

  // Screen the latest user message for gambling / illegal intent and refuse
  // immediately. Returned as a normal reply so the chat shows it as a message.
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")
  if (lastUserMessage && isDisallowed(lastUserMessage.content)) {
    return Response.json({ reply: DISALLOWED_REPLY })
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
