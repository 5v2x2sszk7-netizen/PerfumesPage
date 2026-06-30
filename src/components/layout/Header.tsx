import { siteConfig } from "@/config/site"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { HeaderScrollClient } from "@/components/layout/HeaderScrollClient"
import { ButtonLink } from "@/components/ui/Button"
import { HeaderCartButton } from "@/components/layout/HeaderCartButton"

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
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="group inline-flex flex-col leading-none">
          <span className="relative inline-grid items-center">
            <span
              aria-hidden="true"
              className="invisible font-display text-logo uppercase tracking-[0.35em] sm:text-logo-sm sm:tracking-[0.42em]"
            >
              {siteConfig.wordmark}
            </span>
            <span className="absolute inset-0 font-display text-logo uppercase tracking-brand text-ink-950 transition-[letter-spacing,opacity,color] duration-300 ease-luxe group-hover:opacity-90 group-hover:text-black sm:text-logo-sm sm:tracking-brandSm md:duration-[420ms] group-hover:md:tracking-[0.35em] sm:group-hover:md:tracking-[0.42em]">
              {siteConfig.wordmark}
            </span>
          </span>
          <span className="mt-1 text-[11px] font-light tracking-[0.24em] text-ink-600 transition-[opacity,color,transform] duration-300 ease-luxe group-hover:text-ink-700 group-hover:opacity-90 md:duration-[420ms]">
            {siteConfig.descriptor}
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <nav className="hidden items-center gap-8 text-sm font-medium tracking-ui text-ink-700 md:flex">
            <Link
              href="/catalog"
              className="text-ui-sm text-ink-600 transition-colors duration-luxe-fast ease-luxe hover:text-ink-950"
            >
              Catálogo
            </Link>
            <Link
              href="/catalog"
              className="text-ui-sm text-ink-600 transition-colors duration-luxe-fast ease-luxe hover:text-ink-950"
            >
              Colecciones
            </Link>
            <Link
              href="/account"
              className="text-ui-sm text-ink-600 transition-colors duration-luxe-fast ease-luxe hover:text-ink-950"
            >
              Cuenta
            </Link>
          </nav>

          <HeaderCartButton />

          <ButtonLink
            href="/account"
            className="md:hidden px-4 py-2 shadow-header-cta transition-luxe duration-luxe-fast ease-luxe hover:-translate-y-0.5 hover:shadow-header-cta-hover active:translate-y-0"
          >
            Cuenta
          </ButtonLink>
        </div>
      </Container>
    </header>
  )
}
