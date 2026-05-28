"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { buildWhatsAppLink, formatSpecialOrderWhatsAppMessage } from "@/lib/whatsapp"

type FormState = {
  customerName: string
  phone: string
  perfumeName: string
  brand: string
  sizeMl: string
  comments: string
}

const initialState: FormState = {
  customerName: "",
  phone: "",
  perfumeName: "",
  brand: "",
  sizeMl: "",
  comments: ""
}

export function SpecialOrderForm() {
  const [state, setState] = useState<FormState>(initialState)

  const canSubmit = useMemo(() => {
    return (
      state.customerName.trim().length >= 2 &&
      state.phone.trim().length >= 6 &&
      state.perfumeName.trim().length >= 2 &&
      state.brand.trim().length >= 2 &&
      state.sizeMl.trim().length >= 1
    )
  }, [state])

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    const text = formatSpecialOrderWhatsAppMessage({
      customerName: state.customerName.trim(),
      phone: state.phone.trim(),
      perfumeName: state.perfumeName.trim(),
      brand: state.brand.trim(),
      sizeMl: state.sizeMl.trim(),
      comments: state.comments.trim() ? state.comments.trim() : undefined
    })

    const href = buildWhatsAppLink(text)
    window.open(href, "_blank", "noopener,noreferrer")
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="customerName">Nombre</Label>
          <Input
            id="customerName"
            name="customerName"
            autoComplete="name"
            placeholder="Tu nombre"
            value={state.customerName}
            onChange={(e) => onChange("customerName", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            autoComplete="tel"
            placeholder="Ej. 5512345678"
            value={state.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="perfumeName">Perfume que buscas</Label>
          <Input
            id="perfumeName"
            name="perfumeName"
            placeholder="Ej. Baccarat Rouge 540"
            value={state.perfumeName}
            onChange={(e) => onChange("perfumeName", e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            name="brand"
            placeholder="Ej. Maison Francis Kurkdjian"
            value={state.brand}
            onChange={(e) => onChange("brand", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sizeMl">Tamaño deseado</Label>
        <Input
          id="sizeMl"
          name="sizeMl"
          placeholder="Ej. 50 ml, 100 ml o botella completa"
          value={state.sizeMl}
          onChange={(e) => onChange("sizeMl", e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="comments">Comentarios (opcional)</Label>
        <Textarea
          id="comments"
          name="comments"
          placeholder="Notas, concentraciones, presupuesto, urgencia, etc."
          value={state.comments}
          onChange={(e) => onChange("comments", e.target.value)}
        />
      </div>

      <div className="mt-2 flex justify-center border-t border-black/6 pt-5 sm:justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          variant="gold"
          className="w-full hover:shadow-cta-hover sm:w-auto"
        >
          Enviar solicitud por WhatsApp
        </Button>
      </div>
    </form>
  )
}
