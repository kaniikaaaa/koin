// Privacy-safe product analytics.
//
// Fires ONLY event names from the fixed allowlist below — never transaction
// amounts, merchant names, categories, descriptions, totals, or any financial
// data. That keeps measurement honest with the product promise: your statement
// stays in your browser; analytics only ever learns *that* something happened.
//
// Wiring: set NEXT_PUBLIC_NOVUS_SRC to your Novus.ai loader URL (see
// `components/novus-analytics.tsx`). Until then every call is a safe no-op, so
// the app behaves identically with or without analytics installed.
//
// If Novus's SDK exposes a different call than `window.novus.track(name)`, adapt
// the one line in `track()` — the event call-sites throughout the app stay the same.

export type AnalyticsEvent =
  | "sample_loaded"
  | "csv_imported"
  | "dashboard_viewed"
  | "report_viewed"
  | "workspace_created"

type NovusGlobal = { track?: (event: string) => void }

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return

  try {
    const novus = (window as unknown as { novus?: NovusGlobal }).novus
    if (typeof novus?.track === "function") {
      novus.track(event)
      return
    }

    // Queue events so a late-loading snippet can replay them once ready.
    const scope = window as unknown as { novusLayer?: string[] }
    scope.novusLayer = scope.novusLayer ?? []
    scope.novusLayer.push(event)
  } catch {
    // Analytics must never break the app.
  }
}
