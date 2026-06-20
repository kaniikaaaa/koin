interface Window {
  pendo?: {
    track?: (event: string, properties?: Record<string, unknown>) => void
    initialize?: (config: Record<string, unknown>) => void
    isReady?: () => boolean
    get_visitor_id?: () => string
  }
}
