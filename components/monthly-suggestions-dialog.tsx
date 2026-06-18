"use client"

import { useState } from "react"
import { Lightbulb, Loader2, Sparkles, TrendingDown } from "lucide-react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAiSuggestions } from "@/lib/suggestions"
import type { MonthlySuggestion } from "@/lib/moneymirror"

type LoadStatus = "idle" | "loading" | "done" | "error"

const TONE_META = {
  appreciation: { icon: Sparkles, label: "Good progress" },
  warning: { icon: TrendingDown, label: "Watch out" },
  suggestion: { icon: Lightbulb, label: "Tip" },
} as const

// Guarantee at least `min` slides by topping up from the rule-based fallback
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

export function MonthlySuggestionsDialog({
  monthLabel,
  suggestions,
  context,
}: {
  monthLabel?: string
  suggestions: MonthlySuggestion[]
  context?: string
}) {
  const [open, setOpen] = useState(false)
  const [aiTips, setAiTips] = useState<MonthlySuggestion[] | null>(null)
  const [status, setStatus] = useState<LoadStatus>("idle")
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  // Identifies the data the tips were generated for; if it changes, refetch.
  const dataKey = `${monthLabel ?? ""}::${context ?? ""}`

  if (!monthLabel || suggestions.length === 0) {
    return (
      <Button type="button" variant="outline" disabled>
        <Lightbulb className="size-4" />
        Suggestion for the month
      </Button>
    )
  }

  async function loadTips() {
    if (!context) return
    setStatus("loading")
    setLoadedKey(dataKey)
    try {
      const tips = await getAiSuggestions(context, monthLabel)
      setAiTips(tips)
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && context && (status === "idle" || loadedKey !== dataKey)) {
      void loadTips()
    }
  }

  const aiAvailable = status === "done" && aiTips !== null && aiTips.length > 0
  const slides = withMinimum(aiAvailable ? aiTips! : suggestions, suggestions)

  const description =
    status === "loading"
      ? "Generating personalized tips from your data…"
      : aiAvailable
        ? "AI-generated tips based on your latest month."
        : status === "error"
          ? "Showing built-in tips — AI is unavailable right now."
          : "Focused actions and appreciation from the latest month in your data."

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Sparkles className="size-4" />
          Suggestion for the month
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggestions for {monthLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {status === "loading" ? (
          <div className="mx-auto grid min-h-60 w-full max-w-xl place-items-center rounded-lg border border-border bg-background p-5 text-center">
            <div className="space-y-3 text-muted-foreground">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="text-sm">Thinking through your spending…</p>
            </div>
          </div>
        ) : (
          <Carousel opts={{ align: "start" }} className="mx-auto w-full max-w-xl">
            <CarouselContent>
              {slides.map((suggestion) => {
                const meta = TONE_META[suggestion.tone] ?? TONE_META.suggestion
                const Icon = meta.icon

                return (
                  <CarouselItem key={suggestion.id}>
                    <div className="min-h-60 rounded-lg border border-border bg-background p-5">
                      <div className="flex items-center gap-2 text-primary">
                        <Icon className="size-5" />
                        <span className="text-sm font-medium">{meta.label}</span>
                      </div>
                      <h3 className="mt-5 text-2xl font-semibold leading-8">{suggestion.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{suggestion.detail}</p>
                      {suggestion.value ? (
                        <p className="mt-6 inline-flex rounded-lg bg-muted px-3 py-2 text-lg font-semibold">
                          {suggestion.value}
                        </p>
                      ) : null}
                    </div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}
      </DialogContent>
    </Dialog>
  )
}
