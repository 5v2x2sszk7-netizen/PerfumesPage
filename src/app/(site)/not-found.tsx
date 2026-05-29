import { Container } from "@/components/ui/Container"
import { ButtonLink } from "@/components/ui/Button"

export default function NotFound() {
  return (
    <Container className="py-16">
      <p className="text-xs tracking-section text-ink-500">404</p>
      <h1 className="mt-3 font-display text-3xl text-ink-950">Página no encontrada</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-700">
        Si llegaste aquí desde un enlace de catálogo, es posible que el producto haya cambiado.
      </p>
      <div className="mt-6">
        <ButtonLink href="/catalog">Ir al catálogo</ButtonLink>
      </div>
    </Container>
  )
}
