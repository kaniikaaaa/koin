"use client"

import { useRef, useState, type DragEvent } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, FileText, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics"
import { analyzeSampleCsvs } from "@/lib/moneymirror"
import { importCsvFiles } from "@/lib/csv-import"
import {
  appendAnalysisToStoredWorkspace,
  loadWorkspace,
} from "@/lib/moneymirror-storage"

export function UploadDropzone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  async function analyzeFiles(files: File[]) {
    setIsAnalyzing(true)
    setErrors([])

    try {
      const result = await importCsvFiles(files)
      if (result.ok) {
        track("csv_imported")
        router.push("/dashboard")
      } else {
        setErrors(result.errors)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  function loadSample() {
    setErrors([])
    const analysis = analyzeSampleCsvs("multi")

    if (analysis.transactions.length === 0) {
      setErrors(analysis.errors.length > 0 ? analysis.errors : ["No transactions found in sample data."])
      return
    }

    appendAnalysisToStoredWorkspace(loadWorkspace(), analysis)
    router.push("/dashboard")
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    analyzeFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4">
      <div
        aria-label="Upload CSV files"
        className={`grid min-h-80 cursor-pointer place-items-center rounded-lg border border-dashed p-8 text-center transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-card hover:border-primary/70 hover:bg-muted/30"
        }`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          accept=".csv,text/csv"
          className="sr-only"
          multiple
          type="file"
          onChange={(event) => analyzeFiles(Array.from(event.target.files ?? []))}
        />

        <div className="space-y-5">
          <div className="mx-auto grid size-20 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary">
            <FileSpreadsheet className="size-9" />
          </div>
          <div>
            <p className="text-lg font-semibold">Drop your statement here</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              CSV · parsed on this device
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" disabled={isAnalyzing}>
              <Upload className="size-4" />
              {isAnalyzing ? "Analyzing..." : "Choose files"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isAnalyzing}
              onClick={(event) => {
                event.stopPropagation()
                loadSample()
              }}
            >
              <FileText className="size-4" />
              Load sample
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No file handy? Load a sample statement to see your dashboard in seconds.
          </p>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">We couldn&apos;t read that file</p>
          <div className="mt-1 space-y-0.5 text-destructive/90">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
          <p className="mt-2 text-destructive/80">
            Make sure it has Date, Description, and Amount (or Debit/Credit) columns — or try Load sample.
          </p>
        </div>
      ) : null}
    </div>
  )
}
