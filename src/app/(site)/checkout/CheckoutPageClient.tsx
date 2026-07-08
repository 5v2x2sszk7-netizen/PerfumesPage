"use client"

import { useEffect, useId, useMemo, useState } from "react"
import Image from "next/image"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Input, Label, SelectWithCaret, Textarea } from "@/components/ui/Field"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { Pill } from "@/components/ui/Pill"
import { useCart } from "@/components/cart/CartProvider"
import { useMxPostalCodeLookup } from "@/hooks/useMxPostalCodeLookup"
import type { CartItem } from "@/lib/cart"
import {
  buildCheckoutReservationLinesKey,
  clearActiveCheckoutReservation,
  readActiveCheckoutReservation,
  writeActiveCheckoutReservation
} from "@/lib/checkout/clientReservation"
import { formatPrice } from "@/lib/whatsapp"
import type { CheckoutProvider } from "@/lib/payments"
import { cn } from "@/lib/cn"
import { buildMxStateOptions, getPostalCodeHelper, normalizePostalCodeInput } from "@/lib/mxAddress"
import { evaluatePassword, passwordPolicyHint } from "@/lib/passwordPolicy"
import { calculateShippingQuote } from "@/lib/shipping"

type ProviderAvailability = {
  mercadoPago: boolean
  paypal: boolean
}

type ActiveReservationUi = {
  orderId: string
  provider: CheckoutProvider
  expiresAt: string
}

function normalizeLooseMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function formatMinutesAndSeconds(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

type PublicCustomer = {
  id: string
  email: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  profile: {
    fullName: string
    email: string
    phone: string
    addressLine1: string
    addressLine2?: string
    neighborhood: string
    city: string
    state: string
    postalCode: string
  }
}

type CheckoutFormState = {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  notes: string
}

type AccountResponse = {
  ok?: boolean
  error?: string
  customer?: PublicCustomer | null
}

const initialForm: CheckoutFormState = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  notes: ""
}

function formFromCustomer(customer: PublicCustomer | null): CheckoutFormState {
  if (!customer) return initialForm
  return {
    fullName: customer.profile.fullName || "",
    email: customer.email || "",
    phone: customer.profile.phone || "",
    addressLine1: customer.profile.addressLine1 || "",
    addressLine2: customer.profile.addressLine2 || "",
    neighborhood: customer.profile.neighborhood || "",
    city: customer.profile.city || "",
    state: customer.profile.state || "",
    postalCode: customer.profile.postalCode || "",
    notes: ""
  }
}

function PaymentOption({
  active,
  disabled,
  title,
  subtitle,
  badge,
  onClick
}: {
  active: boolean
  disabled: boolean
  title: string
  subtitle: string
  badge: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-luxe-xl border px-5 py-4 text-left transition",
        active
          ? "border-ink-950 bg-white shadow-[0_14px_36px_rgba(10,10,10,0.08)]"
          : "border-black/8 bg-white/78",
        disabled ? "cursor-not-allowed opacity-55" : "hover:border-ink-950/60 hover:bg-white"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-antiqueGold/70 to-transparent transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="inline-flex rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600 ring-1 ring-inset ring-black/6">
            {badge}
          </span>
          <div>
            <p className="font-semibold text-ink-950">{title}</p>
            <p className="mt-1 text-sm text-ink-600">{subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
            active ? "border-ink-950 bg-ink-950 text-white" : "border-black/12 bg-white text-transparent"
          )}
          aria-hidden="true"
        >
          <span className="text-[10px] leading-none">✓</span>
        </span>
      </div>
    </button>
  )
}

function CheckoutField({
  id,
  label,
  required,
  children
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  )
}

function RequirementItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium",
          ok ? "border-antiqueGold/30 bg-white text-ink-950" : "border-black/10 bg-white/70 text-ink-400"
        ].join(" ")}
        aria-hidden="true"
      >
        {ok ? "✓" : "•"}
      </span>
      <span className={ok ? "text-ink-700" : "text-ink-500"}>{label}</span>
    </div>
  )
}

function PasswordStrengthMeter({
  score,
  label
}: {
  score: number
  label: string
}) {
  const width = `${Math.max(8, Math.min(score, 6) * 16)}%`
  const barClassName =
    score >= 6
      ? "from-antiqueGold via-antiqueGoldDark to-ink-950"
      : score >= 5
        ? "from-antiqueGold/90 via-antiqueGold to-antiqueGoldDark"
        : score >= 4
          ? "from-antiqueGold/75 via-antiqueGold/60 to-ink-700"
          : score >= 2
            ? "from-ink-400 via-ink-500 to-ink-700"
            : "from-ink-300 via-ink-400 to-ink-500"

  return (
    <div className="grid gap-2 rounded-luxe-xl border border-black/10 bg-white/72 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ink-500">
        <span>Fortaleza</span>
        <span className="text-ink-700">{label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-200 ${barClassName}`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

export function CheckoutPageClient({
  buyNowItem,
  initialCustomer,
  providers,
  reservationWindowMinutes
}: {
  buyNowItem: CartItem | null
  initialCustomer: PublicCustomer | null
  providers: ProviderAvailability
  reservationWindowMinutes: number
}) {
  const { items: cartItems, subtotal: cartSubtotal, syncNotice, syncCart } = useCart()
  const [customerAccount, setCustomerAccount] = useState<PublicCustomer | null>(initialCustomer)
  const [checkoutMode, setCheckoutMode] = useState<"guest" | "account">(initialCustomer ? "account" : "guest")
  const [authMode, setAuthMode] = useState<"register" | "login">(initialCustomer ? "login" : "register")
  const [auth, setAuth] = useState({
    fullName: initialCustomer?.profile.fullName || "",
    email: initialCustomer?.email || "",
    password: "",
    confirmPassword: ""
  })
  const [showAccountPassword, setShowAccountPassword] = useState(false)
  const [showAccountConfirmPassword, setShowAccountConfirmPassword] = useState(false)
  const [form, setForm] = useState<CheckoutFormState>(() => formFromCustomer(initialCustomer))
  const [provider, setProvider] = useState<CheckoutProvider>(providers.mercadoPago ? "mercado_pago" : "paypal")
  const [status, setStatus] = useState<"idle" | "submitting">("idle")
  const [error, setError] = useState("")
  const [activeReservation, setActiveReservation] = useState<ActiveReservationUi | null>(null)
  const [reservationNowMs, setReservationNowMs] = useState(() => Date.now())
  const accountPasswordEval = evaluatePassword(auth.password)

  const items = useMemo(() => (buyNowItem ? [buyNowItem] : cartItems), [buyNowItem, cartItems])
  const subtotal = useMemo(
    () => (buyNowItem ? buyNowItem.price * buyNowItem.quantity : cartSubtotal),
    [buyNowItem, cartSubtotal]
  )
  const hasItems = items.length > 0

  const canSubmit =
    hasItems &&
    status !== "submitting" &&
    ((provider === "mercado_pago" && providers.mercadoPago) || (provider === "paypal" && providers.paypal))

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const reservationLinesKey = useMemo(
    () => buildCheckoutReservationLinesKey(items.map((item) => ({ id: item.id, quantity: item.quantity }))),
    [items]
  )
  const checkoutStateOptions = useMemo(() => buildMxStateOptions(form.state), [form.state])
  const checkoutPostalCodeStatus = useMemo(() => getPostalCodeHelper(form.postalCode, form.state), [form.postalCode, form.state])
  const checkoutPostalLookup = useMxPostalCodeLookup(form.postalCode)
  const shippingState = checkoutPostalLookup.status === "success" ? checkoutPostalLookup.result.state || form.state : form.state
  const shippingQuote = useMemo(
    () =>
      calculateShippingQuote({
        subtotal,
        state: shippingState,
        postalCode: form.postalCode
      }),
    [form.postalCode, shippingState, subtotal]
  )
  const heroTotal = hasItems ? formatPrice(shippingQuote.isReady ? shippingQuote.total : subtotal) : "MXN 0"
  const heroMethod = hasItems ? (provider === "paypal" ? "PayPal" : "Mercado Pago") : "Pendiente"
  const providerLabel = provider === "paypal" ? "PayPal" : "Mercado Pago"
  const providerActionLabel = provider === "paypal" ? "Pagar con PayPal" : "Pagar con Mercado Pago"
  const providerDescription =
    provider === "paypal"
      ? "PayPal es ideal si quieres pagar con tu cuenta, tarjetas guardadas o flujo internacional."
      : "Mercado Pago es ideal para cobro directo en Mexico con tarjetas, saldo o metodos locales."
  const neighborhoodListId = useId()
  const reservationRemainingMs = activeReservation ? Math.max(0, new Date(activeReservation.expiresAt).getTime() - reservationNowMs) : 0
  const hasActiveReservation = Boolean(activeReservation && reservationRemainingMs > 0)

  useEffect(() => {
    if (checkoutPostalLookup.status !== "success") return
    const { result } = checkoutPostalLookup
    setForm((current) => {
      if (normalizePostalCodeInput(current.postalCode) !== result.postalCode) return current

      const nextCity = current.city.trim() ? current.city : result.city || result.municipality
      const nextState = result.state || current.state
      const nextNeighborhood =
        current.neighborhood.trim() || result.settlements.length !== 1 ? current.neighborhood : result.settlements[0]

      if (nextCity === current.city && nextState === current.state && nextNeighborhood === current.neighborhood) return current
      return {
        ...current,
        neighborhood: nextNeighborhood,
        city: nextCity,
        state: nextState
      }
    })
  }, [checkoutPostalLookup])

  useEffect(() => {
    let cancelled = false

    async function syncStoredReservation() {
      if (!hasItems || !reservationLinesKey) {
        setActiveReservation(null)
        return
      }

      const stored = readActiveCheckoutReservation()
      if (!stored) {
        setActiveReservation(null)
        return
      }

      const expiresAtMs = new Date(stored.expiresAt).getTime()
      if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
        clearActiveCheckoutReservation(stored.orderId)
        setActiveReservation(null)
        return
      }

      if (stored.linesKey !== reservationLinesKey) {
        setActiveReservation(null)
        return
      }

      try {
        const response = await fetch(`/api/checkout/reservation?orderId=${encodeURIComponent(stored.orderId)}`, {
          cache: "no-store"
        })
        const json = (await response.json().catch(() => null)) as
          | {
              ok?: boolean
              active?: boolean
              provider?: CheckoutProvider
              reservationExpiresAt?: string | null
            }
          | null

        if (!response.ok || !json?.ok || !json.active || !json.provider || !json.reservationExpiresAt) {
          clearActiveCheckoutReservation(stored.orderId)
          if (!cancelled) setActiveReservation(null)
          return
        }

        if (!cancelled) {
          setActiveReservation({
            orderId: stored.orderId,
            provider: json.provider,
            expiresAt: json.reservationExpiresAt
          })
        }
      } catch {
        if (!cancelled) {
          setActiveReservation({
            orderId: stored.orderId,
            provider: stored.provider,
            expiresAt: stored.expiresAt
          })
        }
      }
    }

    void syncStoredReservation()

    return () => {
      cancelled = true
    }
  }, [hasItems, reservationLinesKey])

  useEffect(() => {
    if (!activeReservation) return

    const tick = window.setInterval(() => {
      setReservationNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tick)
    }
  }, [activeReservation])

  useEffect(() => {
    if (!activeReservation) return
    if (reservationRemainingMs > 0) return
    clearActiveCheckoutReservation(activeReservation.orderId)
    setActiveReservation(null)
  }, [activeReservation, reservationRemainingMs])

  async function authenticateCheckoutAccount() {
    if (customerAccount) return customerAccount

    if (authMode === "register" && !accountPasswordEval.ok) {
      throw new Error(`Contrasena invalida. ${passwordPolicyHint()}`)
    }

    if (authMode === "register" && auth.password !== auth.confirmPassword) {
      throw new Error("Las contrasenas no coinciden.")
    }

    const response = await fetch(`/api/account/${authMode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        authMode === "register"
          ? {
              email: auth.email,
              password: auth.password,
              profile: {
                fullName: auth.fullName || form.fullName,
                email: auth.email
              }
            }
          : {
              email: auth.email,
              password: auth.password
            }
      )
    })

    const json = (await response.json().catch(() => null)) as AccountResponse | null
    if (!response.ok || !json?.ok || !json.customer) {
      throw new Error(json?.error || "No se pudo validar tu cuenta.")
    }

    setCustomerAccount(json.customer)
    setAuth((current) => ({
      ...current,
      fullName: current.fullName || json.customer?.profile.fullName || "",
      email: json.customer?.email || current.email,
      password: "",
      confirmPassword: ""
    }))
    setForm((current) => ({
      fullName: current.fullName || json.customer?.profile.fullName || "",
      email: json.customer?.email || current.email,
      phone: current.phone || json.customer?.profile.phone || "",
      addressLine1: current.addressLine1 || json.customer?.profile.addressLine1 || "",
      addressLine2: current.addressLine2 || json.customer?.profile.addressLine2 || "",
      neighborhood: current.neighborhood || json.customer?.profile.neighborhood || "",
      city: current.city || json.customer?.profile.city || "",
      state: current.state || json.customer?.profile.state || "",
      postalCode: current.postalCode || json.customer?.profile.postalCode || "",
      notes: current.notes
    }))
    return json.customer
  }

  async function onSubmit() {
    setError("")

    if (normalizePostalCodeInput(form.postalCode).length !== 5) {
      setError("Ingresa un codigo postal valido de 5 digitos.")
      return
    }

    if (!form.state.trim()) {
      setError("Selecciona un estado para la direccion de envio.")
      return
    }

    if (!shippingQuote.isReady) {
      setError("Completa tu estado y codigo postal para calcular el envio.")
      return
    }

    setStatus("submitting")

    try {
      if (!buyNowItem) {
        const syncResult = await syncCart()
        if (syncResult.changed) {
          throw new Error("Tu carrito cambio por disponibilidad real. Revisa tu seleccion antes de continuar al pago.")
        }
      }

      const account = checkoutMode === "account" ? await authenticateCheckoutAccount() : null
      const customerPayload =
        checkoutMode === "account" && account
          ? {
              ...form,
              email: account.email
            }
          : form

      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          checkoutMode,
          provider,
          customer: customerPayload,
          items: items.map((item) => ({ id: item.id, quantity: item.quantity }))
        })
      })

      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; url?: string; orderId?: string; reservationExpiresAt?: string }
        | null
      const checkoutUrl = json?.url
      const orderId = json?.orderId
      const reservationExpiresAt = json?.reservationExpiresAt

      if (!response.ok || !json?.ok || !checkoutUrl || !orderId || !reservationExpiresAt) {
        throw new Error(json?.error || "No se pudo iniciar el checkout.")
      }

      writeActiveCheckoutReservation({
        orderId,
        provider,
        expiresAt: reservationExpiresAt,
        linesKey: reservationLinesKey
      })

      setActiveReservation({
        orderId,
        provider,
        expiresAt: reservationExpiresAt
      })
      setReservationNowMs(Date.now())
      window.location.assign(checkoutUrl)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar el checkout.")
      setStatus("idle")
    }
  }

  return (
    <Container className="py-8 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <div className="overflow-hidden rounded-luxe-xl border border-black/8 bg-white/72 shadow-[0_18px_50px_rgba(10,10,10,0.05)]">
          <div className="border-b border-black/6 px-4 py-4 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs tracking-section text-ink-500">CHECKOUT</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-black/8 bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700">
                    Pago seguro
                  </span>
                  <span className="inline-flex rounded-full border border-antiqueGold/30 bg-antiqueGold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700">
                    Confirmacion guiada
                  </span>
                </div>
                <h1 className="font-display text-3xl text-ink-950 sm:text-5xl">Pago en linea</h1>
                <p className="max-w-2xl text-sm leading-6 text-ink-700">
                  Completa tus datos y te redirigimos al proveedor para terminar el cobro de forma segura.
                </p>
              </div>
              <div className="grid gap-2 text-sm text-ink-700 sm:grid-cols-3 lg:min-w-[26rem]">
                <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Pedido</p>
                  <p className="mt-1 font-medium text-ink-950">{itemCount} articulo(s)</p>
                </div>
                <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total</p>
                  <p className="mt-1 font-medium text-ink-950">{heroTotal}</p>
                </div>
                <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Metodo</p>
                  <p className="mt-1 font-medium text-ink-950">{heroMethod}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-2 px-4 py-4 text-sm text-ink-600 sm:grid-cols-3 sm:gap-3 sm:px-7">
            {hasItems ? (
              <>
                <p className="leading-6">Datos de envio claros para evitar errores en la entrega.</p>
                <p className="leading-6">Pago confirmado directamente con el proveedor seleccionado.</p>
                <p className="leading-6">Tu pedido queda listo para seguimiento despues de la validacion.</p>
              </>
            ) : (
              <>
                <p className="leading-6">Explora el catalogo y agrega tu fragancia favorita para comenzar.</p>
                <p className="leading-6">Aqui veras el total y el metodo una vez que el pedido este listo.</p>
                <p className="leading-6">Cuando agregues productos podras completar el pago en linea de forma segura.</p>
              </>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-luxe-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {syncNotice ? (
          <div className="rounded-luxe-xl border border-antiqueGold/20 bg-antiqueGold/10 px-4 py-3 text-sm leading-6 text-ink-700">
            {syncNotice}
          </div>
        ) : null}

        {hasItems ? (
          <Card className="border-black/8 bg-gradient-to-r from-white to-ink-50/70 p-4 shadow-[0_16px_42px_rgba(10,10,10,0.04)] sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs tracking-section text-ink-500">RESERVA TEMPORAL</p>
                <p className="text-sm leading-6 text-ink-700">
                  {hasActiveReservation
                    ? `Tu seleccion esta apartada temporalmente mientras completas el pago en ${
                        activeReservation?.provider === "paypal" ? "PayPal" : "Mercado Pago"
                      }.`
                    : `Al continuar al pago, apartamos tu seleccion durante ${reservationWindowMinutes} minuto${
                        reservationWindowMinutes === 1 ? "" : "s"
                      } para reducir el riesgo de sobreventa.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full border border-black/8 bg-white/85 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700">
                  {hasActiveReservation ? "Reserva activa" : "Se activa al continuar"}
                </span>
                {hasActiveReservation ? (
                  <div className="rounded-luxe border border-antiqueGold/25 bg-antiqueGold/10 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Tiempo restante</p>
                    <p className="mt-1 font-display text-2xl text-ink-950">{formatMinutesAndSeconds(reservationRemainingMs)}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        {!hasItems ? (
          <Card className="overflow-hidden p-0 shadow-[0_16px_42px_rgba(10,10,10,0.04)]">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5 p-5 sm:p-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/8 bg-ink-50 text-sm font-semibold tracking-[0.16em] text-ink-700">
                  01
                </div>
                <div className="space-y-3">
                  <p className="text-xs tracking-section text-ink-500">LISTO PARA COMENZAR</p>
                  <h2 className="font-display text-[2rem] text-ink-950 sm:text-3xl">Tu checkout esta vacio</h2>
                  <p className="max-w-xl text-sm leading-6 text-ink-700">
                    Agrega un perfume al carrito o entra desde la ficha del producto para desbloquear el resumen,
                    los metodos de pago y la confirmacion del pedido.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/catalog" variant="gold" className="w-full sm:w-auto">
                    Ir al catalogo
                  </ButtonLink>
                  <ButtonLink href="/cart" variant="outline" className="w-full sm:w-auto">
                    Ver carrito
                  </ButtonLink>
                </div>
              </div>
              <div className="border-t border-black/8 bg-ink-50/55 p-5 sm:p-8 lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs tracking-section text-ink-500">COMO FUNCIONA</p>
                    <h3 className="mt-2 font-display text-2xl text-ink-950">Compra en 3 pasos</h3>
                  </div>
                  <div className="space-y-4 text-sm text-ink-700">
                    <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3 leading-6">
                      Explora el catalogo y elige el perfume que quieres llevar.
                    </div>
                    <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3 leading-6">
                      Agrega tu seleccion al carrito para ver total, articulos y proveedor.
                    </div>
                    <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3 leading-6">
                      Completa tus datos y termina el pago en Mercado Pago o PayPal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden p-4 shadow-[0_16px_42px_rgba(10,10,10,0.04)] sm:p-6">
              <div className="space-y-6">
                <div className="space-y-4 rounded-luxe-xl border border-black/8 bg-white p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-xs tracking-section text-ink-500">ACCESO</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Como quieres comprar</h2>
                      <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                        Paso 0
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-ink-700">
                      Elige entre una compra rapida como invitado o una compra ligada a tu cuenta.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill type="button" variant="admin" active={checkoutMode === "guest"} onClick={() => setCheckoutMode("guest")}>
                      Comprar como invitado
                    </Pill>
                    <Pill type="button" variant="admin" active={checkoutMode === "account"} onClick={() => setCheckoutMode("account")}>
                      Comprar con cuenta
                    </Pill>
                  </div>

                  {checkoutMode === "guest" ? (
                    <div className="rounded-luxe-xl border border-black/8 bg-ink-50/55 px-4 py-4 text-sm leading-6 text-ink-700">
                      Sigues con checkout rapido. Tus datos se usan para esta compra y no necesitas iniciar sesion.
                    </div>
                  ) : customerAccount ? (
                    <div className="rounded-luxe-xl border border-antiqueGold/20 bg-antiqueGold/10 px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                          Cuenta activa
                        </span>
                        <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
                          {customerAccount.email}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink-700">
                        Tus datos guardados se usan para autocompletar esta compra. Si necesitas editar la cuenta,
                        puedes hacerlo desde tu panel personal.
                      </p>
                      <div className="mt-3">
                        <ButtonLink href="/account" variant="outline" className="w-full sm:w-auto">
                          Gestionar cuenta
                        </ButtonLink>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-luxe-xl border border-black/8 bg-ink-50/50 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Pill type="button" variant="admin" active={authMode === "register"} onClick={() => setAuthMode("register")}>
                          Crear cuenta
                        </Pill>
                        <Pill type="button" variant="admin" active={authMode === "login"} onClick={() => setAuthMode("login")}>
                          Iniciar sesion
                        </Pill>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {authMode === "register" ? (
                          <CheckoutField id="accountFullName" label="Nombre para tu cuenta" required>
                            <Input
                              id="accountFullName"
                              className="h-10 sm:h-11"
                              placeholder="Tu nombre"
                              value={auth.fullName}
                              onChange={(e) => setAuth((current) => ({ ...current, fullName: e.target.value }))}
                            />
                          </CheckoutField>
                        ) : null}
                        <CheckoutField id="accountEmail" label="Correo de la cuenta" required>
                          <Input
                            id="accountEmail"
                            type="email"
                            className="h-10 sm:h-11"
                            placeholder="ejemplo@correo.com"
                            value={auth.email}
                            onChange={(e) => setAuth((current) => ({ ...current, email: e.target.value }))}
                          />
                        </CheckoutField>
                        <CheckoutField id="accountPassword" label="Contrasena" required>
                          <div className="relative">
                            <Input
                              id="accountPassword"
                              type={showAccountPassword ? "text" : "password"}
                              autoComplete={authMode === "register" ? "new-password" : "current-password"}
                              className="h-10 pr-16 sm:h-11"
                              placeholder="••••••••••"
                              value={auth.password}
                              onChange={(e) => setAuth((current) => ({ ...current, password: e.target.value }))}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAccountPassword((v) => !v)}
                              className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                            >
                              {showAccountPassword ? "Ocultar" : "Mostrar"}
                            </button>
                          </div>
                          {authMode === "register" ? (
                            <div className="mt-2 grid gap-3">
                              <PasswordStrengthMeter score={accountPasswordEval.score} label={accountPasswordEval.strengthLabel} />
                              <div className="grid gap-2 rounded-luxe-xl border border-black/10 bg-white/70 px-4 py-3 text-xs">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <RequirementItem ok={accountPasswordEval.lengthOk} label="8+ caracteres" />
                                  <RequirementItem ok={accountPasswordEval.numberOk} label="1 numero" />
                                  <RequirementItem ok={accountPasswordEval.specialOk} label="1 caracter especial" />
                                  <RequirementItem ok={accountPasswordEval.noSpaces} label="Sin espacios" />
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </CheckoutField>
                        {authMode === "register" ? (
                          <CheckoutField id="accountConfirmPassword" label="Confirmar contrasena" required>
                            <div className="relative">
                              <Input
                                id="accountConfirmPassword"
                                type={showAccountConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                className="h-10 pr-16 sm:h-11"
                                placeholder="••••••••••"
                                value={auth.confirmPassword}
                                onChange={(e) => setAuth((current) => ({ ...current, confirmPassword: e.target.value }))}
                              />
                              <button
                                type="button"
                                onClick={() => setShowAccountConfirmPassword((v) => !v)}
                                className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                              >
                                {showAccountConfirmPassword ? "Ocultar" : "Mostrar"}
                              </button>
                            </div>
                          </CheckoutField>
                        ) : null}
                      </div>

                      <p className="text-sm leading-6 text-ink-700">
                        {authMode === "register"
                          ? "Crearemos tu cuenta automaticamente cuando continúes al pago."
                          : "Tambien puedes continuar como invitado cuando lo prefieras."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-luxe-xl border border-black/8 bg-ink-50/50 p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-xs tracking-section text-ink-500">DATOS DE ENVIO</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Tu informacion</h2>
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                        Paso 1
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-ink-700">La usamos para contacto, entrega y validacion del pedido.</p>
                  </div>

                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    <CheckoutField id="fullName" label="Nombre completo" required>
                      <Input id="fullName" className="h-10 sm:h-11" value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} />
                    </CheckoutField>
                    <CheckoutField id="email" label="Correo" required>
                      <Input
                        id="email"
                        type="email"
                        className="h-10 sm:h-11"
                        value={form.email}
                        disabled={checkoutMode === "account" && Boolean(customerAccount)}
                        onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      />
                    </CheckoutField>
                    <CheckoutField id="phone" label="Telefono" required>
                      <Input id="phone" className="h-10 sm:h-11" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
                    </CheckoutField>
                    <CheckoutField id="postalCode" label="Codigo postal" required>
                      <Input
                        id="postalCode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        className="h-10 sm:h-11"
                        value={form.postalCode}
                        onChange={(e) => setForm((s) => ({ ...s, postalCode: normalizePostalCodeInput(e.target.value) }))}
                      />
                    </CheckoutField>
                    <div className="sm:col-span-2">
                      <CheckoutField id="addressLine1" label="Calle y numero" required>
                        <Input id="addressLine1" className="h-10 sm:h-11" value={form.addressLine1} onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))} />
                      </CheckoutField>
                    </div>
                    <div className="sm:col-span-2">
                      <CheckoutField id="addressLine2" label="Referencia adicional">
                        <Input id="addressLine2" className="h-10 sm:h-11" value={form.addressLine2} onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))} />
                      </CheckoutField>
                    </div>
                    <div className="sm:col-span-2">
                      <CheckoutField id="neighborhood" label="Colonia">
                        {checkoutPostalLookup.status === "success" && checkoutPostalLookup.result.settlements.length ? (
                          checkoutPostalLookup.result.settlements.length > 12 ? (
                            <>
                              <Input
                                id="neighborhood"
                                className="h-10 sm:h-11"
                                autoComplete="address-level3"
                                list={neighborhoodListId}
                                value={form.neighborhood}
                                onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))}
                              />
                              <datalist id={neighborhoodListId}>
                                {checkoutPostalLookup.result.settlements.map((settlement) => (
                                  <option key={settlement} value={settlement} />
                                ))}
                              </datalist>
                            </>
                          ) : (
                            <SelectWithCaret
                              id="neighborhood"
                              className="h-10 sm:h-11"
                              value={form.neighborhood}
                              onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))}
                            >
                              <option value="">Selecciona una colonia</option>
                              {checkoutPostalLookup.result.settlements.map((settlement) => (
                                <option key={settlement} value={settlement}>
                                  {settlement}
                                </option>
                              ))}
                            </SelectWithCaret>
                          )
                        ) : (
                          <Input
                            id="neighborhood"
                            className="h-10 sm:h-11"
                            autoComplete="address-level3"
                            value={form.neighborhood}
                            onChange={(e) => setForm((s) => ({ ...s, neighborhood: e.target.value }))}
                          />
                        )}
                      </CheckoutField>
                    </div>
                    <CheckoutField id="city" label="Ciudad" required>
                      <Input id="city" className="h-10 sm:h-11" value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
                    </CheckoutField>
                    <CheckoutField id="state" label="Estado" required>
                      <SelectWithCaret
                        id="state"
                        className="h-10 sm:h-11"
                        value={form.state}
                        onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                      >
                        <option value="">Selecciona tu estado</option>
                        {checkoutStateOptions.map((stateOption) => (
                          <option key={stateOption} value={stateOption}>
                            {stateOption}
                          </option>
                        ))}
                      </SelectWithCaret>
                    </CheckoutField>
                    <div className="sm:col-span-2 rounded-luxe border border-black/8 bg-white/78 px-4 py-3 text-sm text-ink-700">
                      <p
                        className={[
                          "leading-6",
                          checkoutPostalLookup.status === "success"
                            ? "text-ink-800"
                            : checkoutPostalLookup.status === "loading"
                              ? "text-ink-700"
                              : checkoutPostalLookup.status === "error"
                                ? "text-ink-700"
                                : checkoutPostalCodeStatus.tone === "confirmed"
                                  ? "text-ink-800"
                                  : checkoutPostalCodeStatus.tone === "ready"
                                    ? "text-ink-700"
                                    : "text-ink-600"
                        ].join(" ")}
                      >
                        {checkoutPostalLookup.status === "loading"
                          ? "Consultando tu codigo postal..."
                          : checkoutPostalLookup.status === "success"
                            ? `Entrega sugerida para ${checkoutPostalLookup.result.city || checkoutPostalLookup.result.municipality}, ${checkoutPostalLookup.result.state}.`
                            : checkoutPostalLookup.status === "error"
                              ? checkoutPostalLookup.error
                              : checkoutPostalCodeStatus.text}
                      </p>
                      {checkoutPostalLookup.status === "success" && checkoutPostalLookup.result.settlements.length ? (
                        <p className="mt-2 text-xs leading-5 text-ink-500">
                          {form.neighborhood.trim()
                            ? `Colonia seleccionada: ${form.neighborhood}.`
                            : `Colonias disponibles: ${checkoutPostalLookup.result.settlements.length}. Selecciona la tuya arriba.`}
                        </p>
                      ) : null}
                      {checkoutPostalLookup.status === "success" &&
                      checkoutPostalLookup.result.settlements.length > 12 &&
                      form.neighborhood.trim() &&
                      !checkoutPostalLookup.result.settlements.some(
                        (settlement) => normalizeLooseMatch(settlement) === normalizeLooseMatch(form.neighborhood)
                      ) ? (
                        <p className="mt-1 text-xs leading-5 text-ink-500">
                          La colonia escrita no coincide con las sugeridas para este codigo postal. Puedes continuar si es una variante.
                        </p>
                      ) : null}
                      {checkoutPostalLookup.status === "success" ? (
                        <p
                          className={cn(
                            "text-xs leading-5 text-ink-500",
                            checkoutPostalLookup.result.settlements.length ? "mt-1" : "mt-2"
                          )}
                        >
                          Municipio: {checkoutPostalLookup.result.municipality}
                          {checkoutPostalLookup.result.zone ? ` · Zona: ${checkoutPostalLookup.result.zone}` : ""}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs leading-5 text-ink-500">
                        {shippingQuote.isReady
                          ? shippingQuote.qualifiesForFreeShipping
                            ? `${shippingQuote.shippingLabel}. Tu pedido ya alcanza envio gratis.`
                            : `${shippingQuote.shippingLabel}: ${formatPrice(shippingQuote.shippingAmount)}. Envio gratis desde ${formatPrice(
                                shippingQuote.freeShippingThreshold
                              )}.`
                          : `Completa tu estado y codigo postal para calcular el envio. Envio gratis desde ${formatPrice(
                              shippingQuote.freeShippingThreshold
                            )}.`}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <CheckoutField id="notes" label="Notas del pedido">
                        <Textarea id="notes" className="min-h-24 sm:min-h-28" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
                      </CheckoutField>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-luxe-xl border border-black/8 bg-white p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className="text-xs tracking-section text-ink-500">PAGO</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Elige proveedor</h2>
                      <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                        Paso 2
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-ink-700">Te llevamos al entorno seguro del proveedor para terminar el cobro.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PaymentOption
                      active={provider === "mercado_pago"}
                      disabled={!providers.mercadoPago}
                      title="Mercado Pago"
                      subtitle={providers.mercadoPago ? "Disponible para cobro" : "Pendiente de credenciales"}
                      badge="Tarjeta y saldo"
                      onClick={() => setProvider("mercado_pago")}
                    />
                    <PaymentOption
                      active={provider === "paypal"}
                      disabled={!providers.paypal}
                      title="PayPal"
                      subtitle={providers.paypal ? "Disponible para cobro" : "Pendiente de credenciales"}
                      badge="Cuenta PayPal"
                      onClick={() => setProvider("paypal")}
                    />
                  </div>
                  <div className="rounded-luxe-xl border border-black/8 bg-ink-50/55 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                        Seleccion actual
                      </span>
                      <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
                        {providerLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-700">{providerDescription}</p>
                  </div>
                </div>

                <div className="rounded-luxe-xl border border-black/8 bg-gradient-to-r from-white to-ink-50/70 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs tracking-section text-ink-500">CONFIRMACION</p>
                      <p className="max-w-xl text-sm leading-6 text-ink-600">
                        Al continuar, te redirigimos a {providerLabel} para completar el pago y regresar a tu confirmacion.
                        {checkoutMode === "account"
                          ? " Si aun no iniciaste sesion, validaremos tu cuenta justo antes de salir al proveedor."
                          : " Esta compra seguira como invitado."}
                      </p>
                    </div>
                    <Button type="button" variant="gold" className="w-full sm:w-auto" disabled={!canSubmit} onClick={onSubmit}>
                      {status === "submitting" ? "Redirigiendo..." : providerActionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="h-fit p-4 shadow-[0_16px_42px_rgba(10,10,10,0.04)] sm:sticky sm:top-24 sm:p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs tracking-section text-ink-500">RESUMEN</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl text-ink-950 sm:text-2xl">Tu pedido</h2>
                    <span className="inline-flex rounded-full bg-ink-950 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
                      Listo para revisar
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-700">Verifica tu seleccion antes de salir al proveedor de pago.</p>
                </div>
                <div className="space-y-3">
                  {items.map((item) => {
                    const isUploadImage = item.imageSrc.startsWith("/uploads/")
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-luxe-xl border border-black/8 bg-white/88 p-3 shadow-[0_10px_24px_rgba(10,10,10,0.03)] sm:items-center"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-luxe bg-ink-50 sm:h-16 sm:w-16">
                          <Image
                            src={item.imageSrc}
                            alt={`${item.name} de ${item.brand}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 56px, 64px"
                            unoptimized={isUploadImage}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs tracking-section text-ink-500">{item.brand}</p>
                              <p className="truncate font-medium text-ink-950">{item.name}</p>
                            </div>
                            <span className="inline-flex shrink-0 rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-700 ring-1 ring-inset ring-black/8">
                              x{item.quantity}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-700">
                            {formatPrice(item.price)} por unidad
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="rounded-luxe-xl border border-black/8 bg-gradient-to-b from-ink-50/70 to-white p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-black/8 pb-3">
                    <span className="text-xs tracking-section text-ink-500">PANORAMA</span>
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-700">{providerLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-ink-700">
                    <span>Articulos</span>
                    <span className="font-medium text-ink-950">{itemCount}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-ink-700">
                    <span>Proveedor</span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                      {providerLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-ink-700">
                    <span>Proceso</span>
                    <span className="font-medium text-ink-950">Revision final</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-ink-700">
                    <span>Perfumes</span>
                    <span className="font-medium text-ink-950">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-ink-700">
                    <span>{shippingQuote.isReady ? shippingQuote.shippingLabel : "Envío"}</span>
                    <span className="font-medium text-ink-950">
                      {shippingQuote.isReady
                        ? shippingQuote.shippingAmount > 0
                          ? formatPrice(shippingQuote.shippingAmount)
                          : "Gratis"
                        : "Pendiente"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4 text-base font-semibold text-ink-950">
                    <span>Total</span>
                    <span>{formatPrice(shippingQuote.isReady ? shippingQuote.total : subtotal)}</span>
                  </div>
                </div>
                <div className="rounded-luxe-xl border border-antiqueGold/20 bg-antiqueGold/10 px-4 py-4">
                  <p className="text-xs tracking-section text-ink-500">TRANQUILIDAD</p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    Tus datos y el pago se validan antes de pasar a preparacion y seguimiento del pedido.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-black/8 pt-4 text-base font-semibold text-ink-950">
                  <span>Total</span>
                  <span>{formatPrice(shippingQuote.isReady ? shippingQuote.total : subtotal)}</span>
                </div>
                <p className="text-xs leading-5 text-ink-500">
                  El cobro final y la validacion se completan en {providerLabel} antes de confirmar tu pedido.
                  {shippingQuote.isReady ? ` Incluye ${shippingQuote.shippingLabel.toLowerCase()}.` : " El envio se define cuando confirmas CP y estado."}
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Container>
  )
}
