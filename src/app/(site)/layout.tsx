import type { ReactNode } from "react"
import { CartProvider } from "@/components/cart/CartProvider"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  )
}
