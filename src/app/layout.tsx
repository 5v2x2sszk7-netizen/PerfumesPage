import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { siteConfig } from "@/config/site"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import "@/styles/globals.css"
import type { ReactNode } from "react"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
})

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body"
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description
  },
  robots: {
    index: true,
    follow: true
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen text-ink-950 antialiased">
        <Header />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
