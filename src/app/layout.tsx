import type { Metadata } from "next"
import Link from "next/link"

import "./globals.css"

export const metadata: Metadata = {
  title: "MoneyMirror",
  description: "Local-first finance tracker MVP for CSV transaction analysis.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <header className="border-b border-border/80 bg-card/80 backdrop-blur">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                MM
              </span>
              <span>MoneyMirror</span>
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
