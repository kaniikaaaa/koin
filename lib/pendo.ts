type PendoTrackFn = (name: string, properties?: Record<string, string | number | boolean>) => void

export function pendoTrack(event: string, properties?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return

  try {
    const pendo = (window as unknown as { pendo?: { track?: PendoTrackFn } }).pendo
    if (typeof pendo?.track === "function") {
      pendo.track(event, properties)
    }
  } catch {
    // Pendo tracking must never break the app
  }
}
