"use client"

import { Lightbulb, Sparkles, TrendingDown } from "lucide-react"

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
import type { MonthlySuggestion } from "@/lib/moneymirror"

export function MonthlySuggestionsDialog({
  monthLabel,
  suggestions,
}: {
  monthLabel?: string
  suggestions: MonthlySuggestion[]
}) {
  if (!monthLabel || suggestions.length === 0) {
    return (
      <Button type="button" variant="outline" disabled>
        <Lightbulb className="size-4" />
        Suggestion for the month
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Lightbulb className="size-4" />
          Suggestion for the month
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggestions for {monthLabel}</DialogTitle>
          <DialogDescription>
            Focused actions and appreciation from the latest month in your data.
          </DialogDescription>
        </DialogHeader>
        <Carousel opts={{ align: "start" }} className="mx-auto w-full max-w-xl">
          <CarouselContent>
            {suggestions.map((suggestion) => (
              <CarouselItem key={suggestion.id}>
                <div className="min-h-60 rounded-lg border border-border bg-background p-5">
                  <div className="flex items-center gap-2 text-primary">
                    {suggestion.tone === "appreciation" ? (
                      <Sparkles className="size-5" />
                    ) : (
                      <TrendingDown className="size-5" />
                    )}
                    <span className="text-sm font-medium">
                      {suggestion.tone === "appreciation" ? "Good progress" : "Suggestion"}
                    </span>
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
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </DialogContent>
    </Dialog>
  )
}
