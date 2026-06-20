"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics"
import { pendoTrack } from "@/lib/pendo"
import { importCsvFiles } from "@/lib/csv-import"
import type { MoneyWorkspace } from "@/lib/moneymirror"

export function ImportCsvButton({
  label = "Add more CSV",
  className,
  onImported,
  onError,
}: {
  label?: string
  className?: string
  onImported: (workspace: MoneyWorkspace) => void
  onError?: (errors: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  async function handleFiles(files: File[]) {
    setIsAnalyzing(true)

    try {
      const result = await importCsvFiles(files)
      if (result.ok) {
        track("csv_imported")
        pendoTrack("csv_imported", {
          fileCount: files.length,
          transactionCount: Object.keys(result.workspace.transactionsById).length,
          sourceName: result.sourceName,
          importSource: "dashboard",
        })
        onImported(result.workspace)
      } else {
        pendoTrack("csv_import_failed", {
          errorCount: result.errors.length,
          errorMessages: result.errors.join("; ").slice(0, 256),
          fileCount: files.length,
          importSource: "dashboard",
        })
        onError?.(result.errors)
      }
    } finally {
      setIsAnalyzing(false)
      // Reset so choosing the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isAnalyzing}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {isAnalyzing ? "Analyzing..." : label}
      </Button>
      <input
        ref={inputRef}
        accept=".csv,text/csv"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
      />
    </>
  )
}
