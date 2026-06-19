"use client"

import { useEffect } from "react"
import { animate, stagger } from "animejs"
import { ArrowDownRight, ArrowUpRight, ShieldCheck, TrendingUp } from "lucide-react"

import { UploadDropzone } from "@/components/upload-dropzone"

type Row = { date: string; label: string; amount: string; credit: boolean }

const PREVIEW_ROWS: Row[] = [
  { date: "01 Jul", label: "Salary · ACME PAYROLL", amount: "1,19,100", credit: true },
  { date: "03 Jul", label: "Rent · URBAN NEST", amount: "32,000", credit: false },
  { date: "09 Jul", label: "Refund · AMAZON", amount: "1,250", credit: true },
  { date: "12 Jul", label: "Dining · SWIGGY", amount: "2,180", credit: false },
]

export default function HomePage() {
  useEffect(() => {
    // Fallback: the CSS hides [data-reveal] until JS reveals it, so if the
    // animation can't run we must restore visibility — this is the only entry point.
    const reveal = () =>
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.style.opacity = "1"
      })

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal()
      return
    }

    try {
      animate("[data-reveal]", {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 650,
        delay: stagger(70, { start: 60 }),
        ease: "out(3)",
      })
    } catch {
      reveal()
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 py-8 sm:px-6">
      <header data-reveal className="border-b border-border pb-6 text-center">
        <span className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">koin</span>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          a private statement reader
        </p>
      </header>

      <div className="flex flex-1 items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Left — pitch, proof, trust */}
          <div>
            <p data-reveal className="font-mono text-xs uppercase tracking-[0.28em] text-primary">
              Local-first · No signup · No bank login
            </p>
            <h1 data-reveal className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              See exactly where your money went.
            </h1>
            <p data-reveal className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Drop a bank-statement CSV and read it back like a clean statement — income, expenses,
              repeated leaks, and a plain-English summary. About 60 seconds, parsed on this device.
            </p>

            <div data-reveal className="mt-7 max-w-md">
              <StatementPreview />
            </div>

            <p data-reveal className="mt-5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              No account · No bank login · Nothing leaves your browser
            </p>
          </div>

          {/* Right — the action */}
          <div data-reveal className="lg:flex lg:flex-col lg:justify-center">
            <UploadDropzone />
          </div>
        </div>
      </div>
    </main>
  )
}

function StatementPreview() {
  return (
    <div className="terminal-grid overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>koin · statement</span>
        <span>Jun–Jul 2026</span>
      </div>
      <div className="divide-y divide-border">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{row.date}</span>
            <span className="flex-1 truncate text-card-foreground">{row.label}</span>
            <span
              className={`flex shrink-0 items-center gap-1 font-mono tabular-nums ${
                row.credit ? "text-positive" : "text-expense"
              }`}
            >
              {row.credit ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {row.credit ? "+" : "−"}₹{row.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Net cashflow
        </span>
        <span className="flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums text-accent">
          <TrendingUp className="size-4" />
          +₹55,702
        </span>
      </div>
    </div>
  )
}
