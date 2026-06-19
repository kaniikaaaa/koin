import {
  analyzeMoneyCsvFiles,
  type MoneyWorkspace,
} from "@/lib/moneymirror"
import {
  appendAnalysisToStoredWorkspace,
  loadWorkspace,
} from "@/lib/moneymirror-storage"

export type CsvImportResult =
  | { ok: true; workspace: MoneyWorkspace; sourceName: string }
  | { ok: false; errors: string[] }

/** Keep only files that look like CSVs by extension or MIME type. */
export function filterCsvFiles(files: File[]) {
  return files.filter(
    (file) => file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv"
  )
}

/**
 * Parse the given files, append the analysis to the stored workspace, and
 * return the updated workspace. Shared by the home dropzone and the dashboard
 * "Add more CSV" button so the import flow lives in one place.
 */
export async function importCsvFiles(files: File[]): Promise<CsvImportResult> {
  const csvFiles = filterCsvFiles(files)

  if (csvFiles.length === 0) {
    return { ok: false, errors: ["Drop or choose at least one CSV file."] }
  }

  const sourceName = csvFiles.length === 1 ? csvFiles[0].name : `${csvFiles.length} files`
  const analysis = await analyzeMoneyCsvFiles(csvFiles)

  if (analysis.transactions.length === 0) {
    return {
      ok: false,
      errors:
        analysis.errors.length > 0
          ? analysis.errors
          : [`No transactions found in ${sourceName}.`],
    }
  }

  const current = loadWorkspace()
  const workspace = appendAnalysisToStoredWorkspace(current, analysis)
  return { ok: true, workspace, sourceName }
}
