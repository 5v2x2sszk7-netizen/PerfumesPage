"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import { useRouter } from "next/navigation"
import Image from "next/image"

type Status = "idle" | "submitting" | "success" | "error"

export function ReviewForm() {
  const router = useRouter()
  const [customerName, setCustomerName] = useState("")
  const [text, setText] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [deliveryCondition, setDeliveryCondition] = useState("")
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [deliveryPhotos, setDeliveryPhotos] = useState<
    Array<{ id: string; fileName: string; localUrl: string; remoteSrc?: string }>
  >([])
  const [uploading, setUploading] = useState(false)
  const [website, setWebsite] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(
      customerName.trim().length >= 2 &&
        text.trim().length >= 10 &&
        status !== "submitting" &&
        !uploading
    )
  }, [customerName, status, text, uploading])

  const visibleRating = hoverRating ?? rating
  const ratingLabel = visibleRating ? `${visibleRating} de 5` : "Sin calificación"

  useEffect(() => {
    return () => {
      for (const photo of deliveryPhotos) {
        URL.revokeObjectURL(photo.localUrl)
      }
    }
  }, [deliveryPhotos])

  function removeDeliveryPhoto(id: string) {
    setDeliveryPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.localUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  async function onUploadDeliveryPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const remaining = Math.max(0, 5 - deliveryPhotos.length)
    if (remaining <= 0) {
      setError("Máximo 5 fotos.")
      return
    }

    const picked = Array.from(files).slice(0, remaining)
    const rejectedCount = files.length - picked.length
    if (rejectedCount > 0) setError("Máximo 5 fotos.")

    const tooLarge = picked.find((f) => f.size > 2 * 1024 * 1024)
    if (tooLarge) {
      setError("Solo imágenes. Máximo 2 MB por foto.")
      return
    }

    const newItems = picked.map((file) => {
      const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      return { id, fileName: file.name || "image", localUrl: URL.createObjectURL(file) }
    })

    setDeliveryPhotos((prev) => [...prev, ...newItems])

    setUploading(true)
    try {
      for (let i = 0; i < picked.length; i += 1) {
        const file = picked[i]
        const itemId = newItems[i].id
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/reviews/upload", { method: "POST", body: form, cache: "no-store" })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "No se pudo subir la foto")
        }
        const json = (await res.json()) as { path: string }
        setDeliveryPhotos((prev) => prev.map((p) => (p.id === itemId ? { ...p, remoteSrc: json.path } : p)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit() {
    if (!canSubmit) return
    setStatus("submitting")
    setError(null)
    try {
      const deliveryImageSrcs = deliveryPhotos.map((p) => p.remoteSrc).filter(Boolean) as string[]
      const payload = {
        customerName: customerName.trim(),
        text: text.trim(),
        rating: rating ?? undefined,
        deliveryCondition: deliveryCondition.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        deliveryImageSrc: deliveryImageSrcs[0] ? deliveryImageSrcs[0].trim() : undefined,
        deliveryImageSrcs: deliveryImageSrcs.length ? deliveryImageSrcs : undefined,
        website
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify(payload),
        cache: "no-store"
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "No se pudo enviar la reseña")
      }
      setCustomerName("")
      setText("")
      setRating(null)
      setHoverRating(null)
      setDeliveryCondition("")
      setDeliveryNotes("")
      for (const photo of deliveryPhotos) URL.revokeObjectURL(photo.localUrl)
      setDeliveryPhotos([])
      setWebsite("")
      setStatus("success")
      router.refresh()
      window.setTimeout(() => setStatus("idle"), 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setStatus("error")
    }
  }

  return (
    <div className="rounded-3xl border border-black/8 bg-white p-6 pb-8">
      <h3 className="font-display text-xl text-ink-950">Deja tu reseña</h3>
      <p className="mt-2 text-sm text-ink-700">Cuéntanos tu experiencia. Se publicará aquí al enviarla.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Nombre *</Label>
          <Input placeholder="Ej. Carlos Mendoza" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Calificación</Label>
          <div className="flex h-11 items-center justify-between gap-4 rounded-xl border border-black/8 bg-white px-4">
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Calificación en estrellas"
              onMouseLeave={() => setHoverRating(null)}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1
                const active = Boolean(visibleRating && value <= visibleRating)
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} estrellas`}
                    onMouseEnter={() => setHoverRating(value)}
                    onFocus={() => setHoverRating(value)}
                    onBlur={() => setHoverRating(null)}
                    onClick={() => setRating((prev) => (prev === value ? null : value))}
                    className={
                      "inline-flex h-6 w-6 items-center justify-center text-xl leading-none transition " +
                      (active ? "text-antiqueGold" : "text-ink-400 hover:text-antiqueGold")
                    }
                  >
                    {active ? "★" : "☆"}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-ink-600">{ratingLabel}</p>
          </div>
        </div>
        <div className="hidden">
          <Label>Website</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="sm:col-span-2 grid gap-2">
          <Label>Reseña *</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
          />
          <p className="text-xs text-ink-500">Mínimo 10 caracteres.</p>
        </div>

        <div className="sm:col-span-2 grid gap-2">
          <Label>¿Cómo te llegó el producto? (opcional)</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <select
                value={deliveryCondition}
                onChange={(e) => setDeliveryCondition(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-black/8 bg-white px-4 pr-10 text-sm leading-none text-ink-950 outline-none transition focus:border-antiqueGold/60 focus:ring-1 focus:ring-antiqueGold/35"
              >
                <option value="">Selecciona una opción</option>
                <option value="perfect">Llegó perfecto</option>
                <option value="box_damaged">Caja dañada</option>
                <option value="leak">Derrame / fuga</option>
                <option value="other">Otro</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-400">
                ▾
              </div>
            </div>
            <Input
              placeholder="Detalles (opcional)"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-black/8 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input
                placeholder="Ningún archivo seleccionado"
                value={
                  deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length === 0
                    ? ""
                    : deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length === 1
                      ? (deliveryPhotos.find((p) => Boolean(p.remoteSrc))?.remoteSrc ?? "")
                      : `${deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length} fotos cargadas`
                }
                readOnly
              />
              <UploadButton
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                disabled={uploading || status === "submitting"}
                className={deliveryPhotos.length >= 5 ? "text-[#60523e]" : ""}
                onSelect={(files) => {
                  void onUploadDeliveryPhotos(files)
                }}
              >
                {uploading
                  ? "Subiendo..."
                  : deliveryPhotos.length >= 5
                    ? "Límite 5"
                    : deliveryPhotos.length
                      ? "Agregar fotos"
                      : "Subir fotos"}
              </UploadButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-items-end">
              <div className="space-y-1">
                {deliveryPhotos.length ? (
                  <p className="text-xs text-ink-600">
                    Fotos: {deliveryPhotos.length}/5
                  </p>
                ) : null}
                <p className="text-xs text-ink-500">Solo imágenes. Máximo 2 MB por foto.</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {deliveryPhotos.slice(0, 5).map((p) => (
                  <div key={p.id} className="relative h-12 w-12 overflow-hidden rounded-xl border border-black/8 bg-ink-50">
                    <Image
                      src={p.localUrl}
                      alt="Foto al recibir"
                      width={48}
                      height={48}
                      sizes="48px"
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      aria-label="Quitar foto"
                      onClick={() => removeDeliveryPhoto(p.id)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink-950 shadow-sm ring-1 ring-black/8"
                    >
                      <span className="text-ui-xs leading-none">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status === "success" ? <p className="mt-3 text-sm text-ink-700">Gracias, reseña enviada.</p> : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500">Si quieres que tu captura salga en el carrusel, envíala por WhatsApp y la agregamos.</p>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          variant="gold"
          className="hover:shadow-cta-hover disabled:cursor-not-allowed disabled:bg-antiqueGoldMuted disabled:text-neutral-600 disabled:hover:bg-antiqueGoldMuted disabled:hover:shadow-none"
        >
          Enviar reseña
        </Button>
      </div>
    </div>
  )
}
