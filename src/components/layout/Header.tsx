import { siteConfig } from "@/config/site"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { HeaderScrollClient } from "@/components/layout/HeaderScrollClient"

export function Header() {
  const topClassName = "border-b border-transparent bg-glass-header-top shadow-none backdrop-blur-0"
  const scrolledClassName = "border-b border-black/6 bg-glass-header-scrolled shadow-header backdrop-blur-sm"

  return (
    <header
      id="site-header"
      className={["sticky top-0 z-header", "transition-luxe-header duration-luxe ease-luxe", topClassName].join(" ")}
    >
      <HeaderScrollClient
        targetId="site-header"
        topClassName={topClassName}
        scrolledClassName={scrolledClassName}
        threshold={8}
      />
      <Container className="flex h-14 items-center justify-between gap-3">
        <Link href="/" className="group inline-flex min-w-0 shrink flex-col leading-none">
          <span className="whitespace-nowrap font-display text-[1.45rem] uppercase tracking-[0.14em] text-ink-950 min-[390px]:text-logo min-[390px]:tracking-brand sm:text-logo-sm sm:tracking-brandSm">
            {siteConfig.wordmark}
          </span>
          <span className="mt-1 whitespace-nowrap text-[9px] font-extralight tracking-[0.22em] text-ink-500 min-[390px]:text-ui-2xs min-[390px]:tracking-descriptor">
            {siteConfig.descriptor}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium tracking-ui text-ink-700 md:flex">
          <Link
            href="/catalog"
            className="text-ui-sm text-ink-600 transition-colors duration-luxe-fast ease-luxe hover:text-ink-950"
          >
            Catálogo
          </Link>
          <Link
            href="/special-order"
            className="text-ui-sm text-ink-600 transition-colors duration-luxe-fast ease-luxe hover:text-ink-950"
          >
            Pedidos especiales
          </Link>
        </nav>

        <nav className="flex shrink-0 items-center gap-1.5 md:hidden">
          <Link
            href="/catalog"
            className="rounded-full bg-ink-950 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-white shadow-sm transition-colors duration-luxe-fast ease-luxe hover:bg-ink-900 min-[390px]:px-3 min-[390px]:text-[11px]"
          >
            Catálogo
          </Link>
          <Link
            href="/special-order"
            className="rounded-full bg-ink-950 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-white shadow-sm transition-colors duration-luxe-fast ease-luxe hover:bg-ink-900 min-[390px]:px-3 min-[390px]:text-[11px]"
          >
            Pedidos
          </Link>
        </nav>
      </Container>
    </header>
  )
}
