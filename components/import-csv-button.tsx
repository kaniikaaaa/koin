"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { importCsvFiles } from "@/lib/csv-import"
import type { MoneyWorkspace } from "@/lib/moneymirror"

export function ImportCsvButton({
  label = "Add more CSV",
  onImported,
  onError,
}: {
  label?: string
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
        onImported(result.workspace)
      } else {
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
