import Link from "next/link"
import { ArrowRight, BarChart3, FileText, Sparkles, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

const flow = [
  {
    title: "Upload",
    detail: "Drop in a CSV statement and normalize dates, descriptions, amounts, and transaction types.",
    icon: Upload,
  },
  {
    title: "Analyze",
    detail: "Categorize spending with a structured finance classifier and editable confidence scores.",
    icon: Sparkles,
  },
  {
    title: "Understand",
    detail: "Review income, expenses, cashflow, category spend, repeated charges, and money leaks.",
    icon: BarChart3,
  },
]

export default function HomePage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-7">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">AI finance tracker MVP</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-foreground sm:text-6xl">
            MoneyMirror
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Upload a transaction file and get a clean read on income, expenses, categories, and where money is quietly leaking.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/upload">
              <Upload className="size-4" />
              Start with CSV
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">
              <BarChart3 className="size-4" />
              Open dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-primary p-4 text-primary-foreground">
            <p className="text-sm opacity-80">Sample income</p>
            <p className="mt-3 text-3xl font-semibold">INR 95k</p>
          </div>
          <div className="rounded-lg bg-expense p-4 text-expense-foreground">
            <p className="text-sm opacity-80">Sample expenses</p>
            <p className="mt-3 text-3xl font-semibold">INR 45k</p>
          </div>
          <div className="rounded-lg bg-accent p-4 text-accent-foreground">
            <p className="text-sm opacity-80">Sample pattern</p>
            <p className="mt-3 text-3xl font-semibold">Food</p>
          </div>
        </div>
        <div className="grid gap-3">
          {flow.map((item) => (
            <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-background p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <item.icon className="size-5" />
              </span>
              <div>
                <h2 className="font-medium">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <Link className="flex items-center justify-between rounded-lg border border-border bg-background p-4 text-sm font-medium hover:bg-muted" href="/reports/current">
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            View AI money summary
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  )
}
