import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

import { NovusAnalytics } from "@/components/novus-analytics"
import { PendoInstall } from "@/components/pendo-install"
import "./globals.css"

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Koin — see where your money went, privately",
  description:
    "Drop a bank-statement CSV and read it back like a clean statement — income, expenses, leaks, and a plain-English summary. Parsed and kept in your browser. No account, no bank login.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <NovusAnalytics />
        <PendoInstall />
      </body>
    </html>
  )
}
