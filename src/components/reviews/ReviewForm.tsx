"use client"

import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Input, Label, SelectWithCaret, Textarea } from "@/components/ui/Field"
import { UploadButton } from "@/components/ui/UploadButton"
import { Card } from "@/components/ui/Surface"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { StarRatingPicker } from "@/components/ui/StarRatingPicker"
import { cn } from "@/lib/cn"

type Status = "idle" | "submitting" | "success" | "error"

type DeliveryPhoto = { id: string; fileName: string; localUrl: string; remoteSrc?: string }

type EligibleReviewOrder = {
  orderId: string
  orderNumber: string
  completedAt: string
  itemSummary: string
  optionLabel: string
}

type EligibilityState =
  | {
      status: "loading"
      authenticated: false
      customerName: string
      totalOrders: number
      eligibleOrders: EligibleReviewOrder[]
      error: string
    }
  | {
      status: "ready"
      authenticated: boolean
      customerName: string
      totalOrders: number
      eligibleOrders: EligibleReviewOrder[]
      error: string
    }
  | {
      status: "error"
      authenticated: false
      customerName: string
      totalOrders: number
      eligibleOrders: EligibleReviewOrder[]
      error: string
    }

type State = {
  orderId: string
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
  orderId: "",
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
  | { type: "set_field"; key: "orderId" | "text" | "deliveryCondition" | "deliveryNotes" | "website"; value: string }
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

export function ReviewForm({ photoUploadsEnabled }: { photoUploadsEnabled: boolean }) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialState)
  const photosRef = useRef<DeliveryPhoto[]>([])
  const [showValidation, setShowValidation] = useState(false)
  const [eligibility, setEligibility] = useState<EligibilityState>({
    status: "loading",
    authenticated: false,
    customerName: "",
    totalOrders: 0,
    eligibleOrders: [],
    error: ""
  })

  const isOrderValid = eligibility.eligibleOrders.some((order) => order.orderId === state.orderId)
  const isTextValid = state.text.trim().length >= 10
  const canSubmit = useMemo(() => {
    return Boolean(
      eligibility.status === "ready" &&
        eligibility.authenticated &&
        isOrderValid &&
        isTextValid &&
        state.status !== "submitting" &&
        !state.uploading
    )
  }, [eligibility, isOrderValid, isTextValid, state.status, state.uploading])
  const canPressSubmit = state.status !== "submitting" && !state.uploading
  const orderError = !isOrderValid ? "Selecciona la compra que quieres reseñar." : ""
  const textError = !isTextValid ? "Escribe una reseña de al menos 10 caracteres." : ""
  const hasValidationErrors = !isOrderValid || !isTextValid

  const visibleRating = state.hoverRating ?? state.rating
  const ratingLabel = visibleRating ? `${visibleRating} de 5` : "Sin calificación"

  useEffect(() => {
    const controller = new AbortController()

    async function loadEligibility() {
      try {
        const res = await fetch("/api/reviews", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        })
        const json = (await res.json().catch(() => null)) as
          | {
              authenticated?: boolean
              customerName?: string
              totalOrders?: number
              eligibleOrders?: EligibleReviewOrder[]
              error?: string
            }
          | null

        if (!res.ok || !json) {
          throw new Error(json?.error || "No se pudo validar tu cuenta para reseñas.")
        }

        setEligibility({
          status: "ready",
          authenticated: json.authenticated === true,
          customerName: typeof json.customerName === "string" ? json.customerName : "",
          totalOrders: typeof json.totalOrders === "number" ? json.totalOrders : 0,
          eligibleOrders: Array.isArray(json.eligibleOrders) ? json.eligibleOrders : [],
          error: ""
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setEligibility({
          status: "error",
          authenticated: false,
          customerName: "",
          totalOrders: 0,
          eligibleOrders: [],
          error: error instanceof Error ? error.message : "No se pudo validar tu cuenta para reseñas."
        })
      }
    }

    void loadEligibility()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (eligibility.status !== "ready" || !eligibility.eligibleOrders.length) return
    const stillValid = eligibility.eligibleOrders.some((order) => order.orderId === state.orderId)
    if (stillValid) return
    dispatch({ type: "set_field", key: "orderId", value: eligibility.eligibleOrders[0].orderId })
  }, [eligibility, state.orderId])

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
    if (!photoUploadsEnabled) {
      dispatch({
        type: "set_error",
        message: "Las fotos en reseñas no están disponibles por ahora en producción. Puedes enviar tu reseña sin imagen."
      })
      return
    }
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
        const firstError = failed[0]?.status === "rejected" && failed[0].reason instanceof Error ? failed[0].reason.message : ""
        dispatch({
          type: "set_error",
          message: firstError || "Algunas fotos no se pudieron subir. Intenta de nuevo."
        })
      }
    } catch (e) {
      dispatch({ type: "set_error", message: e instanceof Error ? e.message : "Error" })
    } finally {
      dispatch({ type: "upload_done" })
    }
  }

  async function onSubmit() {
    if (!canSubmit) {
      setShowValidation(true)
      return
    }
    setShowValidation(false)
    dispatch({ type: "set_status", status: "submitting" })
    dispatch({ type: "set_error", message: null })
    try {
      const deliveryImageSrcs = state.deliveryPhotos.map((p) => p.remoteSrc).filter(Boolean) as string[]
      const payload = {
        orderId: state.orderId,
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

  const selectedOrder = eligibility.eligibleOrders.find((order) => order.orderId === state.orderId)
  const canRenderComposer = eligibility.status === "ready" && eligibility.authenticated && eligibility.eligibleOrders.length > 0

  return (
    <Card className="p-6 pb-8">
      <h3 className="font-display text-xl text-ink-950">Deja tu reseña</h3>
      <p className="mt-2 text-sm text-ink-700">Solo clientes con cuenta y compra confirmada podrán publicar una reseña.</p>

      {eligibility.status === "loading" ? (
        <div className="mt-5 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-4 py-4 text-sm leading-6 text-ink-700">
          Validando tu cuenta y tus compras elegibles...
        </div>
      ) : eligibility.status === "error" ? (
        <div className="mt-5 space-y-3 rounded-luxe-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-sm leading-6 text-red-700">{eligibility.error}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      ) : !eligibility.authenticated ? (
        <div className="mt-5 space-y-3 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-4 py-4">
          <p className="text-sm leading-6 text-ink-700">
            Inicia sesión con tu cuenta para comentar una compra real y dejar la reseña asociada a tu pedido.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/account?mode=login" variant="gold" className="w-full sm:w-auto">
              Iniciar sesión
            </ButtonLink>
            <ButtonLink href="/account?mode=register" variant="outline" className="w-full sm:w-auto">
              Crear cuenta
            </ButtonLink>
          </div>
        </div>
      ) : eligibility.totalOrders === 0 ? (
        <div className="mt-5 space-y-3 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-4 py-4">
          <p className="text-sm leading-6 text-ink-700">
            Tu cuenta todavía no tiene compras confirmadas. En cuanto completes un pedido, aquí podrás dejar tu reseña.
          </p>
          <ButtonLink href="/catalog" variant="outline" className="w-full sm:w-auto">
            Ver catálogo
          </ButtonLink>
        </div>
      ) : eligibility.eligibleOrders.length === 0 ? (
        <div className="mt-5 rounded-luxe-xl border border-black/8 bg-ink-50/45 px-4 py-4 text-sm leading-6 text-ink-700">
          Ya reseñaste todas las compras disponibles de tu cuenta. Gracias por compartir tu experiencia.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-luxe-xl border border-antiqueGold/20 bg-antiqueGold/10 px-4 py-4">
            <p className="text-xs tracking-section text-ink-500">CUENTA ACTIVA</p>
            <p className="mt-2 font-medium text-ink-950">{eligibility.customerName}</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              Tu reseña se publicará como compra verificada y quedará asociada a un pedido real.
            </p>
          </div>
          <div className="sm:col-span-2 grid gap-2">
            <Label className={showValidation && orderError ? "text-red-700" : ""}>Compra a reseñar *</Label>
            <SelectWithCaret
              value={state.orderId}
              aria-invalid={showValidation && Boolean(orderError)}
              className={cn(showValidation && orderError ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200" : "")}
              onChange={(e) => dispatch({ type: "set_field", key: "orderId", value: e.target.value })}
            >
              <option value="">Selecciona una compra</option>
              {eligibility.eligibleOrders.map((order) => (
                <option key={order.orderId} value={order.orderId}>
                  {order.optionLabel}
                </option>
              ))}
            </SelectWithCaret>
            {selectedOrder ? (
              <p className="text-xs text-ink-500">
                Pedido {selectedOrder.orderNumber} · {selectedOrder.itemSummary}
              </p>
            ) : null}
            {showValidation && orderError ? <p className="text-xs text-red-600">{orderError}</p> : null}
          </div>
        <div className="grid gap-2">
          <Label>Calificación</Label>
          <div className="flex h-11 items-center justify-between gap-4 rounded-control border border-black/8 bg-white px-4">
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
          <Label className={showValidation && textError ? "text-red-700" : ""}>Reseña *</Label>
          <Textarea
            value={state.text}
            aria-invalid={showValidation && Boolean(textError)}
            className={cn(showValidation && textError ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-red-200 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.10),0_10px_22px_rgba(239,68,68,0.08)]" : "")}
            onChange={(e) => dispatch({ type: "set_field", key: "text", value: e.target.value })}
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
          />
          <p className={cn("text-xs", showValidation && textError ? "text-red-600" : "text-ink-500")}>
            {showValidation && textError ? textError : "Mínimo 10 caracteres."}
          </p>
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

            <Card radius="lg" className="grid gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <Input
                  placeholder={photoUploadsEnabled ? "Ningún archivo seleccionado" : "Las fotos no están disponibles por ahora"}
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
                  disabled={!photoUploadsEnabled || state.uploading || state.status === "submitting"}
                  className={state.deliveryPhotos.length >= 5 ? "text-inkWarm" : ""}
                  onSelect={(files) => {
                    void onUploadDeliveryPhotos(files)
                  }}
                >
                  {!photoUploadsEnabled
                    ? "Próximamente"
                    : state.uploading
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
                  <p className="text-xs text-ink-500">
                    {photoUploadsEnabled
                      ? "Solo imágenes. Máximo 2 MB por foto."
                      : "Por ahora puedes enviar tu reseña sin foto. La carga de imágenes estará disponible en una siguiente fase."}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2">
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
      )}

      {canRenderComposer && state.error ? <p className="mt-3 text-sm text-red-600">{state.error}</p> : null}
      {canRenderComposer && state.status === "success" ? <p className="mt-3 text-sm text-ink-700">Gracias, reseña enviada.</p> : null}
      {canRenderComposer && showValidation && hasValidationErrors ? (
        <p className="mt-3 text-sm text-ink-700">Completa los campos marcados para poder enviar tu reseña.</p>
      ) : null}

      {canRenderComposer ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-500">Si quieres que tu captura salga en el carrusel, envíala por WhatsApp y la agregamos.</p>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canPressSubmit}
            variant="gold"
            className="hover:shadow-cta-hover disabled:cursor-not-allowed disabled:bg-antiqueGoldMuted disabled:text-ink-600 disabled:hover:bg-antiqueGoldMuted disabled:hover:shadow-none"
          >
            {state.status === "submitting" ? "Enviando..." : state.uploading ? "Subiendo fotos..." : "Enviar reseña"}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
