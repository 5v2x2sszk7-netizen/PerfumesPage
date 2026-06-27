import { siteConfig } from "@/config/site"
import { Container } from "@/components/ui/Container"
import Link from "next/link"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white/78">
      <div className="border-t border-black/6">
        <Container className="pt-14 pb-32 sm:pb-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-col leading-none">
                <p className="font-display text-lg uppercase tracking-luxe text-ink-950">
                  {siteConfig.wordmark}
                </p>
                <p className="mt-1 text-[11px] font-light tracking-[0.24em] text-ink-700">
                  {siteConfig.descriptor}
                </p>
              </div>

              <p className="max-w-footer-copy text-sm leading-body text-ink-700">
                Perfumería de nicho con selección curada. Disponibilidad limitada: confirmamos
                stock, envíos y equivalencias antes de cerrar por WhatsApp.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tracking-ui text-ink-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-antiqueGold/70" />
                  Curado
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-antiqueGold/70" />
                  Personalizado
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-antiqueGold/70" />
                  WhatsApp
                </span>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-ui-xs font-medium tracking-section text-ink-500">
                  NAVEGACIÓN
                </p>
                <div className="grid gap-2 text-sm text-ink-700">
                  <Link href="/catalog" className="w-fit transition-colors hover:text-ink-950">
                    Catálogo
                  </Link>
                  <Link href="/special-order" className="w-fit transition-colors hover:text-ink-950">
                    Pedidos especiales
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-ui-xs font-medium tracking-section text-ink-500">
                  DETALLES
                </p>
                <div className="space-y-2 text-sm text-ink-700">
                  <p className="leading-body">
                    <span className="text-ink-500">Respuesta rápida por WhatsApp</span>
                  </p>
                  <p className="leading-body">
                    <span className="text-ink-500">Envíos a todo México</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-black/6 pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-600">
                © {year} {siteConfig.name}. Todos los derechos reservados.
              </p>
              <p className="text-xs text-ink-600">
                Curaduría, ritmo y detalle.
              </p>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  )
}
