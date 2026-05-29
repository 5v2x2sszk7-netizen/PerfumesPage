import type { Metadata } from "next"
import { Container } from "@/components/ui/Container"
import { SpecialOrderForm } from "@/components/specialOrder/SpecialOrderForm"
import { Card } from "@/components/ui/Surface"
import { SectionHeader } from "@/components/ui/SectionHeader"

export const metadata: Metadata = {
  title: "Pedidos especiales",
  description:
    "Solicita perfumes que no estén en el catálogo. Te respondemos por WhatsApp con disponibilidad y precio."
}

export default function SpecialOrderPage() {
  return (
    <div className="bg-white">
      <Container className="py-12 sm:py-16">
        <SectionHeader
          kicker="PEDIDOS ESPECIALES"
          title={<h1>¿No está en el catálogo?</h1>}
          description={
            <p>
              Completa el formulario y se abrirá WhatsApp con un mensaje listo para enviar. Te confirmamos
              disponibilidad, tiempo estimado y precio.
            </p>
          }
          className="gap-0"
          titleClassName="mt-3"
          descriptionClassName="mt-3"
        />

        <Card className="mt-8 p-6 sm:p-8">
          <SpecialOrderForm />
        </Card>
      </Container>
    </div>
  )
}
