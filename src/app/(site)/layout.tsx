import type { ReactNode } from "react"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
