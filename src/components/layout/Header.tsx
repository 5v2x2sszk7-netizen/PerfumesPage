"use client"

import { siteConfig } from "@/config/site"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { useEffect, useState } from "react"

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        setScrolled(window.scrollY > 8)
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <header
      className={[
        "sticky top-0 z-header",
        "transition-luxe-header duration-luxe ease-luxe",
        scrolled
          ? "border-b border-black/6 bg-glass-header-scrolled shadow-header backdrop-blur-sm"
          : "border-b border-transparent bg-glass-header-top shadow-none backdrop-blur-0"
      ].join(" ")}
    >
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" prefetch={false} className="group inline-flex flex-col leading-none">
          <span className="font-display text-logo uppercase tracking-brand text-ink-950 sm:text-logo-sm sm:tracking-[0.30em]">
            {siteConfig.wordmark}
          </span>
          <span className="mt-1 text-ui-2xs font-extralight tracking-[0.52em] text-ink-500">
            {siteConfig.descriptor}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-[450] tracking-ui text-ink-700 md:flex">
          <Link
            href="/catalog"
            prefetch={false}
            className="text-ui-sm text-ink-600 transition-colors duration-700 ease-luxe hover:text-ink-950"
          >
            Catálogo
          </Link>
          <Link
            href="/special-order"
            prefetch={false}
            className="text-ui-sm text-ink-600 transition-colors duration-700 ease-luxe hover:text-ink-950"
          >
            Pedidos especiales
          </Link>
        </nav>

        <Link
          href="/catalog"
          prefetch={false}
          className="rounded-full bg-ink-950 px-4 py-2 text-sm font-[450] tracking-ui text-white shadow-header-cta transition-luxe duration-700 ease-luxe hover:-translate-y-0.5 hover:bg-ink-900 hover:shadow-header-cta-hover active:translate-y-0 md:hidden"
        >
          Ver catálogo
        </Link>
      </Container>
    </header>
  )
}
