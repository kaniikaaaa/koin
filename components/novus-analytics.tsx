"use client"

import Script from "next/script"

/**
 * Loads the Novus.ai (or any) analytics snippet from NEXT_PUBLIC_NOVUS_SRC.
 * Renders nothing when the env var is unset, so the app runs identically with
 * or without analytics. Events are fired via `track()` in `lib/analytics.ts`
 * and are limited to a privacy-safe allowlist (no financial data).
 */
export function NovusAnalytics() {
  const src = process.env.NEXT_PUBLIC_NOVUS_SRC
  if (!src) return null

  return <Script src={src} strategy="afterInteractive" />
}
