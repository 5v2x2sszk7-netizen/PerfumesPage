import { siteConfig } from "@/config/site"
import Link from "next/link"
import { Container } from "@/components/ui/Container"
import { HeaderScrollClient } from "@/components/layout/HeaderScrollClient"
import { ButtonLink } from "@/components/ui/Button"

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
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="group inline-flex flex-col leading-none">
          <span className="font-display text-logo uppercase tracking-brand text-ink-950 sm:text-logo-sm sm:tracking-brandSm">
            {siteConfig.wordmark}
          </span>
          <span className="mt-1 text-ui-2xs font-extralight tracking-descriptor text-ink-500">
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

        <div className="flex items-center gap-2 md:hidden">
          <ButtonLink
            href="/catalog"
            className="px-4 py-2 shadow-header-cta transition-luxe duration-luxe-fast ease-luxe hover:-translate-y-0.5 hover:shadow-header-cta-hover active:translate-y-0"
          >
            Ver catálogo
          </ButtonLink>
          <ButtonLink
            href="/special-order"
            variant="outline"
            className="px-4 py-2 transition-luxe duration-luxe-fast ease-luxe"
          >
            <span className="sm:hidden">Pedidos</span>
            <span className="hidden sm:inline">Pedidos especiales</span>
          </ButtonLink>
        </div>
      </Container>
    </header>
  )
}
