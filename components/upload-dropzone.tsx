"use client"

import { useRef, useState, type DragEvent } from "react"
import { useRouter } from "next/navigation"
import { Plus, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
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
        className={`grid min-h-80 cursor-pointer place-items-center rounded-lg border border-dashed p-8 text-center transition-colors ${
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
            <Plus className="size-10" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Drop your files here</h1>
            <p className="mt-2 text-sm text-muted-foreground">CSV files only. Multiple months are supported.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Choose files"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isAnalyzing}
              onClick={(event) => {
                event.stopPropagation()
                loadSample()
              }}
            >
              <Sparkles className="size-4" />
              Load sample
            </Button>
          </div>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
