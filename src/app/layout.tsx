import type { Metadata } from "next"
import Link from "next/link"
import { BarChart3, FileText, ShieldCheck, Upload } from "lucide-react"

import "./globals.css"

export const metadata: Metadata = {
  title: "MoneyMirror",
  description: "AI finance tracker MVP for CSV transaction analysis.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border/80 bg-card/80 backdrop-blur">
          <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                MM
              </span>
              <span>MoneyMirror</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground" href="/upload">
                <Upload className="size-4" />
                Upload
              </Link>
              <Link className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground" href="/dashboard">
                <BarChart3 className="size-4" />
                Dashboard
              </Link>
              <Link className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground" href="/reports/current">
                <FileText className="size-4" />
                Report
              </Link>
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Demo user
              </span>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
