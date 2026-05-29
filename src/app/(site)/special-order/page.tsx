import type { Metadata } from "next"
import { Container } from "@/components/ui/Container"
import { SpecialOrderForm } from "@/components/specialOrder/SpecialOrderForm"
import { Card } from "@/components/ui/Surface"

export const metadata: Metadata = {
  title: "Pedidos especiales",
  description:
    "Solicita perfumes que no estén en el catálogo. Te respondemos por WhatsApp con disponibilidad y precio."
}

export default function SpecialOrderPage() {
  return (
    <div className="bg-white">
      <Container className="py-12 sm:py-16">
        <p className="text-xs tracking-section text-ink-500">PEDIDOS ESPECIALES</p>
        <h1 className="mt-3 font-display text-3xl text-ink-950 sm:text-4xl">
          ¿No está en el catálogo?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-700">
          Completa el formulario y se abrirá WhatsApp con un mensaje listo para enviar. Te
          confirmamos disponibilidad, tiempo estimado y precio.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <SpecialOrderForm />
        </Card>
      </Container>
    </div>
  )
}
