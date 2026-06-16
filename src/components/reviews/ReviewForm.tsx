"use client"

import { useEffect, useMemo, useReducer, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Input, Label, SelectWithCaret, Textarea } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import { Card } from "@/components/ui/Surface"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { StarRatingPicker } from "@/components/ui/StarRatingPicker"

type Status = "idle" | "submitting" | "success" | "error"

type DeliveryPhoto = { id: string; fileName: string; localUrl: string; remoteSrc?: string }

type State = {
  customerName: string
  text: string
  rating: number | null
  hoverRating: number | null
  deliveryCondition: string
  deliveryNotes: string
  deliveryPhotos: DeliveryPhoto[]
  uploading: boolean
  website: string
  status: Status
  error: string | null
}

const initialState: State = {
  customerName: "",
  text: "",
  rating: null,
  hoverRating: null,
  deliveryCondition: "",
  deliveryNotes: "",
  deliveryPhotos: [],
  uploading: false,
  website: "",
  status: "idle",
  error: null
}

type Action =
  | { type: "set_field"; key: "customerName" | "text" | "deliveryCondition" | "deliveryNotes" | "website"; value: string }
  | { type: "set_rating"; value: number | null }
  | { type: "set_hover_rating"; value: number | null }
  | { type: "upload_start"; items: DeliveryPhoto[]; warning?: string | null }
  | { type: "upload_done" }
  | { type: "set_photo_remote"; id: string; remoteSrc: string }
  | { type: "remove_photo"; id: string }
  | { type: "set_error"; message: string | null }
  | { type: "set_status"; status: Status }
  | { type: "submit_success" }

function reducer(state: State, action: Action): State {
  if (action.type === "set_field") return { ...state, [action.key]: action.value }
  if (action.type === "set_rating") return { ...state, rating: action.value }
  if (action.type === "set_hover_rating") return { ...state, hoverRating: action.value }
  if (action.type === "upload_start") {
    return {
      ...state,
      uploading: true,
      error: action.warning ?? null,
      deliveryPhotos: [...state.deliveryPhotos, ...action.items]
    }
  }
  if (action.type === "upload_done") return { ...state, uploading: false }
  if (action.type === "set_photo_remote") {
    return {
      ...state,
      deliveryPhotos: state.deliveryPhotos.map((p) => (p.id === action.id ? { ...p, remoteSrc: action.remoteSrc } : p))
    }
  }
  if (action.type === "remove_photo") return { ...state, deliveryPhotos: state.deliveryPhotos.filter((p) => p.id !== action.id) }
  if (action.type === "set_error") return { ...state, error: action.message }
  if (action.type === "set_status") return { ...state, status: action.status }
  if (action.type === "submit_success") {
    return {
      ...initialState,
      status: "success"
    }
  }
  return state
}

export function ReviewForm() {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialState)
  const photosRef = useRef<DeliveryPhoto[]>([])

  const canSubmit = useMemo(() => {
    return Boolean(
      state.customerName.trim().length >= 2 &&
        state.text.trim().length >= 10 &&
        state.status !== "submitting" &&
        !state.uploading
    )
  }, [state.customerName, state.status, state.text, state.uploading])

  const visibleRating = state.hoverRating ?? state.rating
  const ratingLabel = visibleRating ? `${visibleRating} de 5` : "Sin calificación"

  useEffect(() => {
    photosRef.current = state.deliveryPhotos
  }, [state.deliveryPhotos])

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.localUrl)
      }
    }
  }, [])

  function removeDeliveryPhoto(id: string) {
    const item = state.deliveryPhotos.find((p) => p.id === id)
    if (item) URL.revokeObjectURL(item.localUrl)
    dispatch({ type: "remove_photo", id })
  }

  async function onUploadDeliveryPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    dispatch({ type: "set_error", message: null })

    const remaining = Math.max(0, 5 - state.deliveryPhotos.length)
    if (remaining <= 0) {
      dispatch({ type: "set_error", message: "Máximo 5 fotos." })
      return
    }

    const picked = Array.from(files).slice(0, remaining)
    const rejectedCount = files.length - picked.length
    const warning = rejectedCount > 0 ? "Máximo 5 fotos." : null

    const tooLarge = picked.find((f) => f.size > 2 * 1024 * 1024)
    if (tooLarge) {
      dispatch({ type: "set_error", message: "Solo imágenes. Máximo 2 MB por foto." })
      return
    }

    const newItems = picked.map((file) => {
      const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      return { id, fileName: file.name || "image", localUrl: URL.createObjectURL(file) }
    })

    dispatch({ type: "upload_start", items: newItems, warning })
    try {
      const uploadOne = async (file: File, itemId: string) => {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/reviews/upload", { method: "POST", body: form, cache: "no-store" })
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "No se pudo subir la foto")
        }
        const json = (await res.json()) as { path: string }
        dispatch({ type: "set_photo_remote", id: itemId, remoteSrc: json.path })
      }

      const concurrency = 2
      const queue = picked.map((file, i) => ({ file, id: newItems[i].id }))
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
        while (queue.length) {
          const next = queue.shift()
          if (!next) return
          await uploadOne(next.file, next.id)
        }
      })

      const results = await Promise.allSettled(workers)
      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length) {
        dispatch({ type: "set_error", message: "Algunas fotos no se pudieron subir. Intenta de nuevo." })
      }
    } catch (e) {
      dispatch({ type: "set_error", message: e instanceof Error ? e.message : "Error" })
    } finally {
      dispatch({ type: "upload_done" })
    }
  }

  async function onSubmit() {
    if (!canSubmit) return
    dispatch({ type: "set_status", status: "submitting" })
    dispatch({ type: "set_error", message: null })
    try {
      const deliveryImageSrcs = state.deliveryPhotos.map((p) => p.remoteSrc).filter(Boolean) as string[]
      const payload = {
        customerName: state.customerName.trim(),
        text: state.text.trim(),
        rating: state.rating ?? undefined,
        deliveryCondition: state.deliveryCondition.trim() || undefined,
        deliveryNotes: state.deliveryNotes.trim() || undefined,
        deliveryImageSrc: deliveryImageSrcs[0] ? deliveryImageSrcs[0].trim() : undefined,
        deliveryImageSrcs: deliveryImageSrcs.length ? deliveryImageSrcs : undefined,
        website: state.website
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
      for (const photo of state.deliveryPhotos) URL.revokeObjectURL(photo.localUrl)
      dispatch({ type: "submit_success" })
      router.refresh()
      window.setTimeout(() => dispatch({ type: "set_status", status: "idle" }), 3500)
    } catch (e) {
      dispatch({ type: "set_error", message: e instanceof Error ? e.message : "Error" })
      dispatch({ type: "set_status", status: "error" })
    }
  }

  return (
    <Card className="p-4 pb-6 sm:p-6 sm:pb-8">
      <h3 className="font-display text-xl text-ink-950">Deja tu reseña</h3>
      <p className="mt-2 text-sm text-ink-700">Cuéntanos tu experiencia. Se publicará aquí al enviarla.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Nombre *</Label>
          <Input
            placeholder="Ej. Carlos Mendoza"
            value={state.customerName}
            onChange={(e) => dispatch({ type: "set_field", key: "customerName", value: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Calificación</Label>
          <div className="flex min-h-11 flex-col items-start justify-center gap-2 rounded-control border border-black/8 bg-white px-4 py-3 sm:h-11 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
            <StarRatingPicker
              value={state.rating}
              hoverValue={state.hoverRating}
              onHoverChange={(next) => dispatch({ type: "set_hover_rating", value: next })}
              onChange={(next) => dispatch({ type: "set_rating", value: next })}
            />
            <p className="text-xs text-ink-600">{ratingLabel}</p>
          </div>
        </div>
        <div className="hidden">
          <Label>Website</Label>
          <Input value={state.website} onChange={(e) => dispatch({ type: "set_field", key: "website", value: e.target.value })} />
        </div>
        <div className="sm:col-span-2 grid gap-2">
          <Label>Reseña *</Label>
          <Textarea
            value={state.text}
            onChange={(e) => dispatch({ type: "set_field", key: "text", value: e.target.value })}
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
          />
          <p className="text-xs text-ink-500">Mínimo 10 caracteres.</p>
        </div>

        <div className="sm:col-span-2 grid gap-2">
          <Label>¿Cómo te llegó el producto? (opcional)</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectWithCaret
              value={state.deliveryCondition}
              onChange={(e) => dispatch({ type: "set_field", key: "deliveryCondition", value: e.target.value })}
            >
              <option value="">Selecciona una opción</option>
              <option value="perfect">Llegó perfecto</option>
              <option value="box_damaged">Caja dañada</option>
              <option value="leak">Derrame / fuga</option>
              <option value="other">Otro</option>
            </SelectWithCaret>
            <Input
              placeholder="Detalles (opcional)"
              value={state.deliveryNotes}
              onChange={(e) => dispatch({ type: "set_field", key: "deliveryNotes", value: e.target.value })}
            />
          </div>

          <Card radius="lg" className="grid gap-3 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input
                placeholder="Ningún archivo seleccionado"
                value={
                  state.deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length === 0
                    ? ""
                    : state.deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length === 1
                      ? (state.deliveryPhotos.find((p) => Boolean(p.remoteSrc))?.remoteSrc ?? "")
                      : `${state.deliveryPhotos.filter((p) => Boolean(p.remoteSrc)).length} fotos cargadas`
                }
                readOnly
              />
              <UploadButton
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                disabled={state.uploading || state.status === "submitting"}
                className={state.deliveryPhotos.length >= 5 ? "w-full text-inkWarm sm:w-auto" : "w-full sm:w-auto"}
                onSelect={(files) => {
                  void onUploadDeliveryPhotos(files)
                }}
              >
                {state.uploading
                  ? "Subiendo..."
                  : state.deliveryPhotos.length >= 5
                    ? "Límite 5"
                    : state.deliveryPhotos.length
                      ? "Agregar fotos"
                      : "Subir fotos"}
              </UploadButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-items-end">
              <div className="space-y-1">
                {state.deliveryPhotos.length ? (
                  <p className="text-xs text-ink-600">
                    Fotos: {state.deliveryPhotos.length}/5
                  </p>
                ) : null}
                <p className="text-xs text-ink-500">Solo imágenes. Máximo 2 MB por foto.</p>
              </div>
              <div className="grid grid-cols-4 gap-2 min-[390px]:grid-cols-5">
                {state.deliveryPhotos.slice(0, 5).map((p) => (
                  <div key={p.id} className="relative h-12 w-12 overflow-hidden rounded-control border border-black/8 bg-ink-50">
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
          </Card>
        </div>
      </div>

      {state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}
      {state.status === "success" ? <p className="mt-3 text-sm text-ink-700">Gracias, reseña enviada.</p> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs text-ink-500">Si quieres que tu captura salga en el carrusel, envíala por WhatsApp y la agregamos.</p>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          variant="gold"
          className="w-full hover:shadow-cta-hover disabled:cursor-not-allowed disabled:bg-antiqueGoldMuted disabled:text-ink-600 disabled:hover:bg-antiqueGoldMuted disabled:hover:shadow-none sm:w-auto"
        >
          Enviar reseña
        </Button>
      </div>
    </Card>
  )
}
