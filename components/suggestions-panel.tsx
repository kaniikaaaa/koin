"use client"

import { useEffect, useState } from "react"
import { Lightbulb, Sparkles, TrendingDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getAiSuggestions } from "@/lib/suggestions"
import { pendoTrack } from "@/lib/pendo"
import type { MonthlySuggestion } from "@/lib/moneymirror"

type LoadStatus = "idle" | "loading" | "done" | "error"

const TONE_META = {
  appreciation: { icon: Sparkles, label: "Good progress", badge: "border-transparent bg-primary/15 text-primary" },
  warning: { icon: TrendingDown, label: "Watch out", badge: "border-transparent bg-expense/15 text-expense" },
  suggestion: { icon: Lightbulb, label: "Tip", badge: "border-transparent bg-secondary text-secondary-foreground" },
} as const

// Guarantee at least `min` tips by topping up from the rule-based fallback
// (skipping titles already shown).
function withMinimum(primary: MonthlySuggestion[], fallback: MonthlySuggestion[], min = 3) {
  const seen = new Set(primary.map((item) => item.title.toLowerCase()))
  const result = [...primary]

  for (const item of fallback) {
    if (result.length >= min) break
    const key = item.title.toLowerCase()
    if (!seen.has(key)) {
      result.push(item)
      seen.add(key)
    }
  }

  return result
}

// Cache tips per (month, summary) so Strict-Mode double-mounts and revisits don't
// fire duplicate paid OpenAI calls. Failures are evicted so they can retry.
const tipsCache = new Map<string, Promise<MonthlySuggestion[]>>()
const trackedTipKeys = new Set<string>()

function fetchTips(context: string, monthLabel?: string) {
  const key = `${monthLabel ?? ""}::${context}`
  let cached = tipsCache.get(key)
  if (!cached) {
    cached = getAiSuggestions(context, monthLabel)
    tipsCache.set(key, cached)
    cached.catch(() => tipsCache.delete(key))
  }
  return cached
}

export function SuggestionsPanel({
  monthLabel,
  suggestions,
  context,
}: {
  monthLabel?: string
  suggestions: MonthlySuggestion[]
  context?: string
}) {
  const [aiTips, setAiTips] = useState<MonthlySuggestion[] | null>(null)
  const [status, setStatus] = useState<LoadStatus>("idle")

  // Fetch AI tips whenever the month or finance summary changes.
  useEffect(() => {
    if (!context) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the loading skeleton while the fetch runs
    setStatus("loading")
    fetchTips(context, monthLabel)
      .then((tips) => {
        if (cancelled) return
        setAiTips(tips)
        setStatus("done")
        const tipKey = `${monthLabel ?? ""}::${context}`
        if (!trackedTipKeys.has(tipKey)) {
          trackedTipKeys.add(tipKey)
          pendoTrack("ai_suggestions_generated", {
            tipCount: tips.length,
            monthLabel: monthLabel ?? "",
            source: "ai",
          })
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [context, monthLabel])

  if (!monthLabel || suggestions.length === 0) return null

  const aiAvailable = status === "done" && aiTips !== null && aiTips.length > 0
  const tips = withMinimum(aiAvailable ? aiTips! : suggestions, suggestions)

  const note =
    status === "loading"
      ? "Generating personalized tips from your data…"
      : aiAvailable
        ? "AI-generated from your latest month."
        : status === "error"
          ? "Built-in tips — AI is unavailable right now."
          : "Focused actions from the latest month in your data."

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-primary" />
            Suggestions for {monthLabel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        </div>
        {context ? (
          <p className="font-mono text-[11px] text-muted-foreground">anonymized, merchant-free summary → OpenAI</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {status === "loading"
          ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32" />)
          : tips.map((tip) => {
              const meta = TONE_META[tip.tone] ?? TONE_META.suggestion
              const Icon = meta.icon
              return (
                <Card key={tip.id} className="gap-0 rounded-lg py-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`gap-1.5 font-normal ${meta.badge}`}>
                        <Icon className="size-3.5" />
                        {meta.label}
                      </Badge>
                      {tip.value ? (
                        <span className="font-mono text-sm font-semibold tabular-nums">{tip.value}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-semibold">{tip.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{tip.detail}</p>
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </section>
  )
}
