// Privacy-safe product analytics via Pendo.
//
// Fires ONLY event names from the fixed allowlist below — never transaction
// amounts, merchant names, categories, descriptions, totals, or any financial
// data. That keeps measurement honest with the product promise: your statement
// stays in your browser; analytics only ever learns *that* something happened.
//
// The Pendo agent is installed in `components/pendo-install.tsx`. Its install
// snippet defines `window.pendo.track` as a queueing stub immediately, so events
// fired before the agent finishes loading are queued and replayed automatically.

export type AnalyticsEvent =
  | "sample_loaded"
  | "csv_imported"
  | "dashboard_viewed"
  | "report_viewed"
  | "workspace_created"

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return

  try {
    window.pendo?.track?.(event)
  } catch {
    // Analytics must never break the app.
  }
}
