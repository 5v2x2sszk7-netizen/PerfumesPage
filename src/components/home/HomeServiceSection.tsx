import { Container } from "@/components/ui/Container"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { SectionHeader } from "@/components/ui/SectionHeader"

export function HomeServiceSection() {
  const steps = [
    {
      number: "01",
      kicker: "EXPERIENCIA",
      title: "Compra asistida",
      body: "Recomendaciones, equivalencias y disponibilidad real antes de confirmar.",
      className: "group border-t border-black/6 pt-6"
    },
    {
      number: "02",
      kicker: "CONFIANZA",
      title: "Transparencia",
      body: "Tamaño, precio y estatus con lenguaje claro. Sin promesas vacías.",
      className: "group border-t border-black/6 pt-6 sm:pl-6 lg:translate-y-2"
    },
    {
      number: "03",
      kicker: "CATÁLOGO",
      title: "Pedidos especiales",
      body: "Si no está listado, lo buscamos: disponibilidad, opción y cotización.",
      className: "group border-t border-black/6 pt-6 sm:pl-10 lg:translate-y-4"
    }
  ] as const

  return (
    <section className="bg-transparent">
      <Container className="pt-12 pb-16">
        <div className="grid gap-y-8 gap-x-12 lg:grid-cols-12 lg:items-start">
          <LazyReveal delayMs={0} className="lg:col-span-5">
            <div className="max-w-home-intro">
              <SectionHeader
                kicker="SERVICIO"
                title={<h2>Menos catálogo infinito. Más curaduría.</h2>}
                description={
                  <p>
                    Un proceso breve, claro y personal: elegimos contigo, confirmamos stock real y cuidamos el detalle
                    antes de cerrar por WhatsApp.
                  </p>
                }
                className="gap-0"
                kickerClassName="tracking-brand"
                titleClassName="mt-4 text-3xl sm:text-4xl"
                descriptionClassName="mt-7"
              />
            </div>
          </LazyReveal>

          <div className="grid gap-8 lg:col-span-7 lg:gap-10">
            {steps.map((step, idx) => (
              <LazyReveal key={step.number} delayMs={120 + idx * 80}>
                <div className={step.className}>
                  <div className="grid gap-4 sm:grid-cols-[92px_1fr] sm:gap-7">
                    <p className="font-display text-4xl font-light leading-none text-black/35">{step.number}</p>
                    <div className="space-y-2">
                      <p className="text-xs tracking-section text-ink-500">{step.kicker}</p>
                      <h3 className="font-display text-2xl leading-display text-ink-950">{step.title}</h3>
                      <p className="text-sm leading-body text-ink-700">{step.body}</p>
                    </div>
                  </div>
                </div>
              </LazyReveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
