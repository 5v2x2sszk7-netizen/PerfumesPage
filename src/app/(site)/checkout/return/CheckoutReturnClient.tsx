"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ButtonLink } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { useCart } from "@/components/cart/CartProvider"
import { formatCustomerOrderNumber } from "@/lib/orderPresentation"
import type { CheckoutProvider } from "@/lib/payments"

type ResultState =
  | { kind: "loading"; message: string }
  | { kind: "success"; title: string; detail: string; orderId: string; orderNumber: string; providerLabel: string; confirmedAt: string }
  | { kind: "error"; title: string; detail: string }

type CachedReturnState = {
  kind: "success"
  orderId?: string
  orderNumber?: string
  providerLabel?: string
  confirmedAt?: string
}

function formatConfirmationDate(value: string) {
  if (!value) return ""
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value))
  } catch {
    return value
  }
}

function paymentProviderLabel(provider: CheckoutProvider | null) {
  if (provider === "paypal") return "PayPal"
  if (provider === "mercado_pago") return "Mercado Pago"
  return ""
}

function buildSuccessState(input: { orderId?: string; orderNumber?: string; providerLabel?: string; confirmedAt?: string }): ResultState {
  const rawOrderId = input.orderId || input.orderNumber || ""
  return {
    kind: "success",
    title: "Pago confirmado",
    detail: "Tu pago fue validado correctamente. Ahora comenzaremos la preparacion de tu pedido y te notificaremos por correo cuando cambie de estado.",
    orderId: rawOrderId,
    orderNumber: rawOrderId ? formatCustomerOrderNumber(rawOrderId) : "",
    providerLabel: input.providerLabel || "",
    confirmedAt: input.confirmedAt || ""
  }
}

export function CheckoutReturnClient({
  provider,
  status,
  orderId,
  paymentId,
  collectionId,
  merchantOrderId,
  externalReference
}: {
  provider: CheckoutProvider | null
  status: string
  orderId: string
  paymentId: string
  collectionId: string
  merchantOrderId: string
  externalReference: string
}) {
  const { clearCart } = useCart()
  const clearedRef = useRef(false)
  const mercadoPagoReference = paymentId || collectionId || merchantOrderId || externalReference
  const finalizeKey = provider ? `${provider}:${orderId || mercadoPagoReference || status}` : ""
  const [result, setResult] = useState<ResultState>(() => ({
    kind: "loading",
    message: "Validando tu pago..."
  }))

  const isImmediateResult = useMemo(() => {
    if (status === "cancelled" || status === "failure") return true
    if (provider === "mercado_pago" && status && status !== "approved" && !mercadoPagoReference) return true
    return false
  }, [mercadoPagoReference, provider, status])

  useEffect(() => {
    if (isImmediateResult) {
      setResult({
        kind: "error",
        title: status === "cancelled" ? "Pago cancelado" : "Pago no completado",
        detail: "Puedes volver al checkout e intentarlo otra vez con el mismo perfume."
      })
      return
    }

    if (!provider) {
      setResult({
        kind: "error",
        title: "No se pudo identificar el proveedor",
        detail: "Regresa al catalogo e intenta de nuevo."
      })
      return
    }

    if (provider === "paypal" && !orderId) {
      setResult({
        kind: "error",
        title: "Falta la orden de PayPal",
        detail: "PayPal no regreso un token valido."
      })
      return
    }

    if (provider === "mercado_pago" && !mercadoPagoReference && !status) {
      setResult({
        kind: "error",
        title: "Falta la referencia de Mercado Pago",
        detail: "Mercado Pago no regreso un identificador de pago."
      })
      return
    }

    let cancelled = false

    async function finalize() {
      const sessionKey = finalizeKey ? `perfimes-checkout-return:${finalizeKey}` : ""

      if (sessionKey) {
        const cached = window.sessionStorage.getItem(sessionKey)
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as CachedReturnState | null
            if (parsed?.kind === "success") {
              setResult(
                buildSuccessState({
                  orderNumber: parsed.orderNumber || "",
                  orderId: parsed.orderId || parsed.orderNumber || "",
                  providerLabel: parsed.providerLabel || paymentProviderLabel(provider),
                  confirmedAt: parsed.confirmedAt || ""
                })
              )
              return
            }
          } catch {
            if (cached === "success") {
              setResult(
                buildSuccessState({
                  orderNumber: "",
                  orderId: "",
                  providerLabel: paymentProviderLabel(provider),
                  confirmedAt: ""
                })
              )
              return
            }
          }
        }
      }

      try {
        const response = await fetch("/api/checkout/finalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            provider,
            orderId,
            paymentId,
            collectionId,
            merchantOrderId,
            externalReference,
            status
          })
        })

        const json = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; status?: string; orderId?: string; provider?: CheckoutProvider; completedAt?: string }
          | null
        if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo confirmar el pago.")

        if (!cancelled) {
          const normalized = (json.status || status || "").toLowerCase()
          const isSuccess = ["approved", "completed"].includes(normalized)
          const successProviderLabel = paymentProviderLabel(json.provider || provider)
          const successConfirmedAt = json.completedAt || ""
          if (sessionKey && isSuccess) {
            window.sessionStorage.setItem(
              sessionKey,
              JSON.stringify({
                kind: "success",
                orderId: json.orderId || "",
                orderNumber: json.orderId || "",
                providerLabel: successProviderLabel,
                confirmedAt: successConfirmedAt
              } satisfies CachedReturnState)
            )
          }
          setResult(
            isSuccess
              ? buildSuccessState({
                  orderNumber: json.orderId || "",
                  providerLabel: successProviderLabel,
                  confirmedAt: successConfirmedAt
                })
              : {
                  kind: "error",
                  title: "Pago pendiente",
                  detail: `Estado reportado por ${provider === "paypal" ? "PayPal" : "Mercado Pago"}: ${json.status || status || "pendiente"}.`
                }
          )
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            kind: "error",
            title: "No se pudo confirmar el pago",
            detail: error instanceof Error ? error.message : "Intenta verificarlo de nuevo."
          })
        }
      }
    }

    void finalize()

    return () => {
      cancelled = true
    }
  }, [collectionId, externalReference, finalizeKey, isImmediateResult, merchantOrderId, orderId, paymentId, provider, status])

  useEffect(() => {
    if (result.kind === "success" && !clearedRef.current) {
      clearCart()
      clearedRef.current = true
    }
  }, [clearCart, result.kind])

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden p-0">
          {result.kind === "loading" ? (
            <div className="space-y-3 p-6 sm:p-8">
              <p className="text-xs tracking-section text-ink-500">PAGO</p>
              <h1 className="font-display text-3xl text-ink-950">Validando</h1>
              <p className="text-sm text-ink-700">{result.message}</p>
            </div>
          ) : result.kind === "success" ? (
            <div>
              <div className="border-b border-black/6 px-6 py-6 sm:px-8 sm:py-7">
                <div className="space-y-4">
                  <p className="text-xs tracking-section text-ink-500">RESULTADO</p>
                  <div className="space-y-3">
                    <h1 className="font-display text-3xl text-ink-950">{result.title}</h1>
                    {result.orderNumber ? (
                      <div className="inline-flex rounded-luxe border border-black/8 bg-ink-50/65 px-4 py-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Pedido</p>
                          <p className="mt-1 font-medium text-ink-950">{result.orderNumber}</p>
                        </div>
                      </div>
                    ) : null}
                    <p className="max-w-xl text-sm leading-7 text-ink-700">{result.detail}</p>
                    {result.providerLabel || result.confirmedAt ? (
                      <p className="text-xs leading-6 text-ink-500">
                        {result.providerLabel ? `Proveedor: ${result.providerLabel}` : ""}
                        {result.providerLabel && result.confirmedAt ? " · " : ""}
                        {result.confirmedAt ? `Confirmado el ${formatConfirmationDate(result.confirmedAt)}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
                <div className="rounded-luxe-xl border border-black/8 bg-white/82 p-4 sm:p-5">
                  <p className="text-xs tracking-section text-ink-500">SIGUIENTE PASO</p>
                  <div className="mt-3 grid gap-2 text-sm text-ink-700">
                    <div className="flex items-center justify-between rounded-luxe border border-black/8 bg-ink-50/70 px-4 py-3">
                      <span className="font-medium text-ink-950">Pago confirmado</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-600">Listo</span>
                    </div>
                    <div className="flex items-center justify-between rounded-luxe border border-black/8 bg-white/85 px-4 py-3">
                      <span>Preparacion</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Siguiente</span>
                    </div>
                    <div className="flex items-center justify-between rounded-luxe border border-black/8 bg-white/85 px-4 py-3">
                      <span>Envio</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Despues</span>
                    </div>
                    <div className="flex items-center justify-between rounded-luxe border border-black/8 bg-white/85 px-4 py-3">
                      <span>Entregado</span>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Final</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={result.orderId ? `/account#order-${result.orderId}` : "/account#orders"} variant="gold">
                    Ver mi pedido
                  </ButtonLink>
                  <ButtonLink href="/catalog" variant="outline">
                    Seguir comprando
                  </ButtonLink>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-6 sm:p-8">
              <p className="text-xs tracking-section text-ink-500">RESULTADO</p>
              <h1 className="font-display text-3xl text-ink-950">{result.title}</h1>
              <p className="text-sm text-ink-700">{result.detail}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/checkout" variant="gold">
                  Volver al checkout
                </ButtonLink>
                <ButtonLink href="/catalog" variant="outline">
                  Ir al catalogo
                </ButtonLink>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}
