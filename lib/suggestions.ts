import { createId } from "@/lib/money-id"
import type { MonthlySuggestion } from "@/lib/moneymirror"

type RawTip = { tone?: unknown; title?: unknown; detail?: unknown; value?: unknown }

function normalizeTone(tone: unknown): MonthlySuggestion["tone"] {
  return tone === "appreciation" || tone === "warning" ? tone : "suggestion"
}

/**
 * Ask the AI suggestions route for money tips based on the user's finance
 * summary and return them as MonthlySuggestion objects. Throws (with a
 * human-readable message) on failure so the caller can fall back gracefully.
 */
export async function getAiSuggestions(
  context: string,
  monthLabel?: string
): Promise<MonthlySuggestion[]> {
  const response = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, monthLabel }),
  })

  const data = (await response.json().catch(() => null)) as
    | { tips?: RawTip[]; error?: string }
    | null

  if (!response.ok || !Array.isArray(data?.tips)) {
    throw new Error(data?.error ?? "Could not generate suggestions.")
  }

  return data.tips
    .filter((tip) => tip && typeof tip.title === "string" && typeof tip.detail === "string")
    .map((tip) => ({
      id: createId("aitip"),
      tone: normalizeTone(tip.tone),
      title: String(tip.title),
      detail: String(tip.detail),
      value: tip.value ? String(tip.value) : undefined,
    }))
}
