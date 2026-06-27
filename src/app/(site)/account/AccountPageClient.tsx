"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { Input, Label, SelectWithCaret } from "@/components/ui/Field"
import { Button, ButtonLink } from "@/components/ui/Button"
import { Pill } from "@/components/ui/Pill"
import { useMxPostalCodeLookup } from "@/hooks/useMxPostalCodeLookup"
import { buildMxStateOptions, getPostalCodeHelper, normalizePostalCodeInput } from "@/lib/mxAddress"
import { formatCustomerOrderNumber, orderStatusCustomerLabel, orderStatusSupportingLabel } from "@/lib/orderPresentation"
import { formatPrice } from "@/lib/whatsapp"
import { evaluatePassword, passwordPolicyHint } from "@/lib/passwordPolicy"

function normalizeLooseMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

type CustomerProfile = {
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

type PublicCustomer = {
  id: string
  email: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  profile: CustomerProfile
}

type OrderItem = {
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  quantity: number
}

type OrderRecord = {
  id: string
  provider: "mercado_pago" | "paypal"
  checkoutMode?: "guest" | "account"
  customerId?: string
  createdAt: string
  completedAt: string
  paymentStatus: string
  fulfillmentStatus?: string
  paymentReference: string
  customer: {
    fullName: string
    email: string
    phone: string
    addressLine1: string
    addressLine2?: string
    neighborhood?: string
    city: string
    state: string
    postalCode: string
    notes?: string
  }
  subtotal: number
  items: OrderItem[]
}

type AccountResponse = {
  ok?: boolean
  error?: string
  customer?: PublicCustomer | null
  orders?: OrderRecord[]
}

const emptyProfile: CustomerProfile = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: ""
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatRelativeDate(value: string) {
  try {
    const target = new Date(value).getTime()
    const now = Date.now()
    const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24))
    const absoluteDays = Math.abs(diffDays)

    if (absoluteDays <= 0) return "Hoy"
    if (absoluteDays <= 7) {
      return new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" }).format(diffDays, "day")
    }

    return formatDate(value)
  } catch {
    return value
  }
}

function providerLabel(provider: OrderRecord["provider"]) {
  return provider === "paypal" ? "PayPal" : "Mercado Pago"
}

function readOrderHash() {
  if (typeof window === "undefined") return ""
  const hash = window.location.hash.replace(/^#/, "").trim()
  return hash.startsWith("order-") ? hash.slice("order-".length) : ""
}

function orderDestinationLabel(order: OrderRecord) {
  const location = [order.customer.city, order.customer.state].filter(Boolean).join(", ")
  if (order.customer.neighborhood?.trim()) {
    return `${order.customer.neighborhood}, ${location}`
  }
  return location || "Dirección por confirmar"
}

function profileFromCustomer(customer: PublicCustomer | null) {
  if (!customer) return emptyProfile
  return {
    fullName: customer.profile.fullName || "",
    email: customer.email || "",
    phone: customer.profile.phone || "",
    addressLine1: customer.profile.addressLine1 || "",
    addressLine2: customer.profile.addressLine2 || "",
    neighborhood: customer.profile.neighborhood || "",
    city: customer.profile.city || "",
    state: customer.profile.state || "",
    postalCode: customer.profile.postalCode || ""
  }
}

function resolveProfileWithPostalLookup(
  profile: CustomerProfile,
  postalLookup: ReturnType<typeof useMxPostalCodeLookup>
) {
  if (postalLookup.status !== "success") return profile

  const { result } = postalLookup
  if (normalizePostalCodeInput(profile.postalCode) !== result.postalCode) return profile

  const nextCity = profile.city.trim() ? profile.city : result.city || result.municipality
  const nextState = result.state || profile.state
  const nextNeighborhood = profile.neighborhood.trim() || result.settlements.length !== 1 ? profile.neighborhood : result.settlements[0]

  if (nextCity === profile.city && nextState === profile.state && nextNeighborhood === profile.neighborhood) {
    return profile
  }

  return {
    ...profile,
    neighborhood: nextNeighborhood,
    city: nextCity,
    state: nextState
  }
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
}

function SignatureLine() {
  return (
    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-antiqueGold/55 to-transparent" />
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

export function AccountPageClient({
  initialCustomer,
  initialOrders
}: {
  initialCustomer: PublicCustomer | null
  initialOrders: OrderRecord[]
}) {
  const [customer, setCustomer] = useState<PublicCustomer | null>(initialCustomer)
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders)
  const [authMode, setAuthMode] = useState<"register" | "login">("register")
  const [auth, setAuth] = useState({
    fullName: "",
    email: initialCustomer?.email || "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profile, setProfile] = useState<CustomerProfile>(() => profileFromCustomer(initialCustomer))
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "auth" | "profile" | "logout">("idle")
  const [highlightedOrderId, setHighlightedOrderId] = useState("")
  const [expandedOrderId, setExpandedOrderId] = useState("")

  const isBusy = status !== "idle"
  const totalOrders = orders.length
  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + order.subtotal, 0), [orders])
  const accountStateLabel = customer ? "Activa" : "Invitado"
  const ordersLabel = `${totalOrders} ${totalOrders === 1 ? "pedido" : "pedidos"}`
  const spentLabel = totalSpent > 0 ? formatPrice(totalSpent) : "Sin compras"
  const profilePostalLookup = useMxPostalCodeLookup(profile.postalCode)
  const resolvedProfile = useMemo(() => resolveProfileWithPostalLookup(profile, profilePostalLookup), [profile, profilePostalLookup])
  const profileCompletionFields = [
    resolvedProfile.fullName,
    resolvedProfile.phone,
    resolvedProfile.postalCode,
    resolvedProfile.addressLine1,
    resolvedProfile.city,
    resolvedProfile.state
  ]
  const profileCompletion = Math.round(
    (profileCompletionFields.filter((value) => value.trim().length > 0).length / profileCompletionFields.length) * 100
  )
  const profileCompletionLabel = `Perfil ${profileCompletion} % completo`
  const profileCompletionHint =
    profileCompletion >= 100
      ? "Tu cuenta ya está lista para un checkout más rápido."
      : profileCompletion >= 80
        ? "Solo un paso más."
        : profileCompletion >= 50
          ? "Solo falta agregar tu dirección."
      : resolvedProfile.addressLine1.trim()
        ? "Completa tu perfil para agilizar tus próximas compras."
        : "Agrega una dirección para agilizar tus próximas compras."
  const customerFirstName = customer?.profile.fullName.trim().split(/\s+/)[0] || ""
  const heroGreeting = customerFirstName ? `Hola, ${customerFirstName}.` : "Te damos la bienvenida."
  const heroTitle = customer ? "Mi cuenta" : "Te damos la bienvenida a MALO Fragances"
  const heroDescription = customer
    ? "Direcciones, compras y un checkout más rápido, reunidos en un solo lugar."
    : "Guarda direcciones, revisa pedidos y compra más rápido cuando quieras."
  const passwordEval = evaluatePassword(auth.password)
  const featuredOrder = orders[0] ?? null
  const recentOrders = featuredOrder ? orders.slice(1, 4) : []
  const latestPurchaseDate = featuredOrder?.completedAt || featuredOrder?.createdAt || ""
  const latestPurchaseItem = featuredOrder?.items[0] ?? null
  const profileStateOptions = useMemo(() => buildMxStateOptions(resolvedProfile.state), [resolvedProfile.state])
  const profilePostalCodeStatus = useMemo(
    () => getPostalCodeHelper(resolvedProfile.postalCode, resolvedProfile.state),
    [resolvedProfile.postalCode, resolvedProfile.state]
  )
  const neighborhoodListId = useId()
  const passwordRecoveryHref = useMemo(() => {
    const params = new URLSearchParams()
    if (auth.email.trim()) {
      params.set("email", auth.email.trim())
    }

    const query = params.toString()
    return query ? `/account/recover?${query}` : "/account/recover"
  }, [auth.email])

  useEffect(() => {
    function syncHighlightedOrder() {
      const orderId = readOrderHash()
      setHighlightedOrderId(orderId)
      if (orderId) {
        setExpandedOrderId(orderId)
      }
      if (!orderId) return () => undefined

      const timeoutId = window.setTimeout(() => {
        setHighlightedOrderId((current) => (current === orderId ? "" : current))
      }, 2600)

      return () => window.clearTimeout(timeoutId)
    }

    let cleanup = syncHighlightedOrder()
    const handleHashChange = () => {
      cleanup()
      cleanup = syncHighlightedOrder()
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => {
      cleanup()
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  function toggleOrderDetails(orderId: string) {
    setExpandedOrderId((current) => (current === orderId ? "" : orderId))
  }

  async function refreshAccount() {
    const response = await fetch("/api/account/me", { cache: "no-store" })
    const json = await readJson<AccountResponse>(response)
    if (!response.ok || !json?.ok) {
      throw new Error(json?.error || "No se pudo cargar tu cuenta.")
    }
    const nextCustomer = json.customer ?? null
    setCustomer(nextCustomer)
    setOrders(Array.isArray(json.orders) ? json.orders : [])
    setProfile(profileFromCustomer(nextCustomer))
    setAuth((current) => ({
      ...current,
      email: nextCustomer?.email || current.email,
      fullName: nextCustomer?.profile.fullName || current.fullName
    }))
  }

  async function onSubmitAuth() {
    setError("")
    setMessage("")

    if (authMode === "register" && !passwordEval.ok) {
      setError(`Contraseña inválida. ${passwordPolicyHint()}`)
      return
    }

    if (authMode === "register" && auth.password !== auth.confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setStatus("auth")
    try {
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
                  fullName: auth.fullName,
                  email: auth.email
                }
              }
            : {
                email: auth.email,
                password: auth.password
              }
        )
      })

      const json = await readJson<AccountResponse>(response)
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo iniciar la sesión.")
      }

      await refreshAccount()
      setAuth((current) => ({
        ...current,
        password: "",
        confirmPassword: ""
      }))
      setMessage(authMode === "register" ? "Tu cuenta ya está lista." : "Sesión iniciada correctamente.")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo completar la acción.")
    } finally {
      setStatus("idle")
    }
  }

  async function onSaveProfile() {
    setError("")
    setMessage("")

    if (normalizePostalCodeInput(resolvedProfile.postalCode).length !== 5) {
      setError("Ingresa un código postal válido de 5 dígitos.")
      return
    }

    if (!resolvedProfile.state.trim()) {
      setError("Selecciona un estado para tu dirección.")
      return
    }

    setStatus("profile")

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profile: resolvedProfile
        })
      })

      const json = await readJson<AccountResponse>(response)
      if (!response.ok || !json?.ok || !json.customer) {
        throw new Error(json?.error || "No se pudo guardar tu perfil.")
      }

      setCustomer(json.customer)
      setProfile(profileFromCustomer(json.customer))
      setMessage("Tus datos quedaron guardados.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar tu perfil.")
    } finally {
      setStatus("idle")
    }
  }

  async function onLogout() {
    setError("")
    setMessage("")
    setStatus("logout")

    try {
      const response = await fetch("/api/account/logout", {
        method: "POST"
      })
      const json = await readJson<{ ok?: boolean; error?: string }>(response)
      if (!response.ok || !json?.ok) throw new Error(json?.error || "No se pudo cerrar la sesión.")

      setCustomer(null)
      setOrders([])
      setProfile(emptyProfile)
      setAuth({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: ""
      })
      setMessage("Sesión cerrada.")
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "No se pudo cerrar la sesión.")
    } finally {
      setStatus("idle")
    }
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <div className="overflow-hidden rounded-luxe-xl border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(247,244,238,0.94))] shadow-[0_18px_50px_rgba(10,10,10,0.05)]">
          <div className="border-b border-black/6 px-4 py-3.5 sm:px-7 sm:py-4">
            <div className="grid gap-4 lg:grid-cols-[1.04fr_0.96fr] lg:items-end">
              <div className="space-y-2">
                <p className="text-[11px] tracking-section text-ink-400">{customer ? heroGreeting : "CUENTA"}</p>
                <div className="flex flex-wrap gap-2">
                  {customer ? (
                    <>
                      <span className="inline-flex rounded-full border border-antiqueGold/30 bg-antiqueGold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-800">
                        Cuenta con historial
                      </span>
                      <span className="inline-flex rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
                        Sesión activa
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex rounded-full border border-antiqueGold/30 bg-antiqueGold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-800">
                        Compra como invitado
                      </span>
                      <span className="inline-flex rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
                        Cuenta con historial
                      </span>
                    </>
                  )}
                </div>
                <h1 className="font-display text-3xl leading-none text-ink-950 sm:text-[2.8rem]">{heroTitle}</h1>
                <p className="max-w-2xl text-sm leading-6 text-ink-700">{heroDescription}</p>
                <p className="text-sm text-ink-500">
                  {customer ? "SESIÓN INICIADA" : "Crea una presencia más personal dentro de la tienda"}
                </p>
              </div>

              <div className="grid gap-3 text-sm text-ink-700 sm:grid-cols-3">
                <div className="rounded-luxe border border-black/10 bg-white/92 px-4 py-3 shadow-[0_12px_30px_rgba(10,10,10,0.04)] transition-all duration-200 ease-luxe hover:-translate-y-[2px] hover:shadow-[0_18px_36px_rgba(10,10,10,0.055)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500">01 Estado</p>
                  <p className="mt-1.5 text-base font-medium text-ink-950">{accountStateLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">{customer ? "Cuenta lista para comprar" : "Checkout rápido disponible"}</p>
                </div>
                <div className="rounded-luxe border border-black/10 bg-white/92 px-4 py-3 shadow-[0_12px_30px_rgba(10,10,10,0.04)] transition-all duration-200 ease-luxe hover:-translate-y-[2px] hover:shadow-[0_18px_36px_rgba(10,10,10,0.055)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500">02 Órdenes</p>
                  <p className="mt-1.5 text-base font-medium text-ink-950">{ordersLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    {totalOrders > 0 ? "Historial ligado a tu cuenta" : "Aún no hay compras registradas"}
                  </p>
                </div>
                <div className="rounded-luxe border border-black/10 bg-white/92 px-4 py-3 shadow-[0_12px_30px_rgba(10,10,10,0.04)] transition-all duration-200 ease-luxe hover:-translate-y-[2px] hover:shadow-[0_18px_36px_rgba(10,10,10,0.055)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500">03 Acumulado</p>
                  <p className="mt-1.5 text-base font-medium text-ink-950">{spentLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    {totalSpent > 0 ? "Total invertido hasta hoy" : "Tu selección comienza aquí"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-4 py-2.5 text-sm text-ink-600 sm:grid-cols-3 sm:px-7 sm:py-3">
            <p className="leading-6">Guarda tu nombre, teléfono y dirección para futuras compras.</p>
            <p className="leading-6">Mantén el modo invitado para compras rápidas y flexibles.</p>
            <p className="leading-6">Conecta nuevas órdenes a tu cuenta para revisarlas después.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-luxe-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-luxe-xl border border-antiqueGold/25 bg-[linear-gradient(135deg,rgba(251,248,241,0.96),rgba(247,243,233,0.92))] px-4 py-3 text-sm leading-6 text-ink-700 shadow-[0_12px_28px_rgba(188,149,79,0.08)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-antiqueGold/25 bg-white text-[11px] font-medium text-ink-900">
                OK
              </span>
              <p>{message}</p>
            </div>
          </div>
        ) : null}

        {!customer ? (
          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <Card className="relative overflow-hidden p-5 shadow-[0_16px_42px_rgba(10,10,10,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[1px] sm:p-7">
              <SignatureLine />
              <div className="space-y-7">
                <div className="space-y-3 rounded-luxe-xl border border-black/10 bg-ink-50/40 p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      type="button"
                      variant="admin"
                      active={authMode === "register"}
                      className="px-5 sm:px-6"
                      onClick={() => setAuthMode("register")}
                    >
                      Crear cuenta
                    </Pill>
                    <Pill
                      type="button"
                      variant="admin"
                      active={authMode === "login"}
                      className="px-5 sm:px-6"
                      onClick={() => setAuthMode("login")}
                    >
                      Iniciar sesión
                    </Pill>
                  </div>
                  <div>
                    <p className="text-xs tracking-section text-ink-500">{authMode === "register" ? "REGISTRO" : "ACCESO"}</p>
                    <h2 className="mt-2 font-display text-2xl text-ink-950">
                      {authMode === "register" ? "Crea tu cuenta" : "Entra con tu correo"}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-ink-700">
                      {authMode === "register"
                          ? "Accede a una experiencia más fluida: direcciones guardadas, pedidos visibles y un checkout más ágil."
                          : "Accede a tus datos guardados, pedidos vinculados y a una experiencia más fluida."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-7">
                  {authMode === "register" ? (
                    <div className="grid gap-3">
                      <Label htmlFor="register-fullName">Nombre completo</Label>
                      <Input
                        id="register-fullName"
                        className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                        placeholder="Tu nombre"
                        value={auth.fullName}
                        onChange={(e) => setAuth((current) => ({ ...current, fullName: e.target.value }))}
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <Label htmlFor="account-email">Correo</Label>
                    <Input
                      id="account-email"
                      type="email"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      placeholder="ejemplo@correo.com"
                      value={auth.email}
                      onChange={(e) => setAuth((current) => ({ ...current, email: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="account-password">Contraseña</Label>
                      {authMode === "login" ? (
                        <a
                          href={passwordRecoveryHref}
                          className="text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                        >
                          ¿La olvidaste?
                        </a>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Input
                        id="account-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                        className="h-12 border-black/12 pr-16 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                        placeholder="••••••••••"
                        value={auth.password}
                        onChange={(e) => setAuth((current) => ({ ...current, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    {authMode === "register" ? (
                      <div className="grid gap-3">
                        <PasswordStrengthMeter score={passwordEval.score} label={passwordEval.strengthLabel} />
                        <div className="grid gap-2 rounded-luxe-xl border border-black/10 bg-white/70 px-4 py-3 text-xs">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <RequirementItem ok={passwordEval.lengthOk} label="8+ caracteres" />
                          <RequirementItem ok={passwordEval.numberOk} label="1 número" />
                          <RequirementItem ok={passwordEval.specialOk} label="1 carácter especial" />
                          <RequirementItem ok={passwordEval.noSpaces} label="Sin espacios" />
                        </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {authMode === "register" ? (
                    <div className="grid gap-3">
                      <Label htmlFor="account-confirmPassword">Confirmar contraseña</Label>
                      <div className="relative">
                        <Input
                          id="account-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="h-12 border-black/12 pr-16 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                          placeholder="••••••••••"
                          value={auth.confirmPassword}
                          onChange={(e) => setAuth((current) => ({ ...current, confirmPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                        >
                          {showConfirmPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-luxe-xl border border-black/10 bg-gradient-to-r from-white to-ink-50/70 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-sm leading-6 text-ink-600">
                      {authMode === "register"
                        ? "Después podrás completar y editar tu dirección desde esta misma página."
                        : "También puedes continuar como invitado cuando lo prefieras."}
                    </p>
                    <Button
                      type="button"
                      variant="gold"
                      className="h-14 w-full px-7 text-[15px] font-semibold tracking-[0.08em] text-white shadow-[0_14px_32px_rgba(188,149,79,0.18)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_38px_rgba(188,149,79,0.24)] sm:w-auto"
                      disabled={
                        isBusy ||
                        (authMode === "register" &&
                          (!passwordEval.ok || !auth.confirmPassword.trim() || auth.password !== auth.confirmPassword))
                      }
                      onClick={onSubmitAuth}
                    >
                      {status === "auth"
                        ? authMode === "register"
                          ? "Creando cuenta..."
                          : "Entrando..."
                        : authMode === "register"
                          ? "Crear cuenta"
                          : "Entrar"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="relative h-fit overflow-hidden p-5 shadow-[0_16px_42px_rgba(10,10,10,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[1px] sm:p-7">
              <SignatureLine />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(188,149,79,0.12),transparent_36%),linear-gradient(180deg,rgba(249,247,243,0.85),rgba(255,255,255,0.8))]" />
              <div className="relative space-y-6">
                <div className="space-y-3">
                  <p className="text-xs tracking-section text-ink-500">EXPERIENCIA</p>
                  <h2 className="mt-2 font-display text-[2rem] text-ink-950">Comprar será más rápido</h2>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-ink-700">Guarda direcciones, consulta pedidos y compra sin fricción.</p>
                </div>
                <div className="space-y-3 text-sm text-ink-700">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 h-px w-5 shrink-0 bg-antiqueGold/55" />
                    <p>Direcciones guardadas para acelerar tu siguiente compra.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-2 h-px w-5 shrink-0 bg-antiqueGold/55" />
                    <p>Pedidos accesibles desde una vista más personal y ordenada.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-2 h-px w-5 shrink-0 bg-antiqueGold/55" />
                    <p>Modo invitado disponible cuando prefieras una compra rápida.</p>
                  </div>
                </div>
                <div className="rounded-luxe-xl border border-antiqueGold/20 bg-white/78 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500">DETALLE</p>
                  <p className="mt-3 font-display text-xl leading-8 text-ink-950">
                    Una cuenta pensada para que el lujo se sienta simple, no pesado.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink-600">Una experiencia clara, rápida y diseñada para durar.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink
                    href="/checkout"
                    variant="gold"
                    className="h-14 w-full px-7 text-[15px] font-semibold tracking-[0.08em] text-white shadow-[0_14px_32px_rgba(188,149,79,0.18)] transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
                  >
                    Ir al checkout
                  </ButtonLink>
                  <ButtonLink href="/catalog" variant="outline" className="h-14 w-full px-6 transition-all duration-200 hover:-translate-y-0.5 sm:w-auto">
                    Ver catálogo
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
            <Card className="relative overflow-hidden p-5 shadow-[0_16px_42px_rgba(10,10,10,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[1px] sm:p-6">
              <SignatureLine />
              <div className="space-y-7">
                <div className="space-y-4 rounded-luxe-xl border border-black/10 bg-ink-50/45 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-section text-ink-500">PERFIL</p>
                      <h2 className="mt-2 font-display text-2xl text-ink-950">Mi perfil</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      {profileCompletion < 100 ? (
                        <span className="inline-flex rounded-full border border-antiqueGold/14 bg-[linear-gradient(135deg,rgba(251,248,241,0.96),rgba(247,243,233,0.9))] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-600">
                          {profileCompletionLabel}
                        </span>
                      ) : null}
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-[2px] text-[9px] font-medium uppercase tracking-[0.12em] ring-1 ring-inset",
                          profileCompletion >= 100
                            ? "border border-emerald-100/90 bg-emerald-50/55 text-emerald-600 ring-emerald-100/80"
                            : "bg-white text-ink-700 ring-black/8"
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-flex h-3 w-3 items-center justify-center rounded-full text-[7px]",
                            profileCompletion >= 100
                              ? "border border-emerald-100 bg-white text-emerald-600"
                              : "border border-antiqueGold/25 bg-antiqueGold/12 text-ink-900"
                          ].join(" ")}
                        >
                          ✓
                        </span>
                        {profileCompletion >= 100 ? "Perfil completo" : "Cuenta verificada"}
                      </span>
                    </div>
                  </div>
                  {profileCompletion < 100 ? <p className="text-sm leading-6 text-ink-600">{profileCompletionHint}</p> : null}
                  <div className="rounded-luxe border border-black/8 bg-white/86 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Correo principal</p>
                    <p className="mt-2 break-all text-[13px] font-medium leading-6 text-ink-950 sm:text-sm">{customer.email}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-antiqueGold/24 bg-antiqueGold/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-antiqueGold/25 bg-white text-[9px] text-ink-900">
                          ✓
                        </span>
                        Verificado
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-ink-700">Cuenta creada: {formatDate(customer.createdAt)}</p>
                </div>

                <div className="grid gap-7 sm:grid-cols-2">
                  <div className="grid gap-3">
                    <Label htmlFor="profile-fullName">Nombre completo</Label>
                    <Input
                      id="profile-fullName"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={profile.fullName}
                      onChange={(e) => setProfile((current) => ({ ...current, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="profile-email">Correo</Label>
                    <Input id="profile-email" type="email" className="h-12 border-black/12 bg-ink-50/70" value={profile.email} disabled />
                  </div>
                  <div className="grid gap-3">
                      <Label htmlFor="profile-phone">Teléfono</Label>
                    <Input
                      id="profile-phone"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={profile.phone}
                      onChange={(e) => setProfile((current) => ({ ...current, phone: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3">
                      <Label htmlFor="profile-postalCode">Código postal</Label>
                    <Input
                      id="profile-postalCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={profile.postalCode}
                      onChange={(e) =>
                        setProfile((current) => ({ ...current, postalCode: normalizePostalCodeInput(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:col-span-2">
                      <Label htmlFor="profile-addressLine1">Calle y número</Label>
                    <Input
                      id="profile-addressLine1"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={profile.addressLine1}
                      onChange={(e) => setProfile((current) => ({ ...current, addressLine1: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 sm:col-span-2">
                    <Label htmlFor="profile-addressLine2">Referencia adicional</Label>
                    <Input
                      id="profile-addressLine2"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={profile.addressLine2}
                      onChange={(e) => setProfile((current) => ({ ...current, addressLine2: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 sm:col-span-2">
                    <Label htmlFor="profile-neighborhood">Colonia</Label>
                    {profilePostalLookup.status === "success" && profilePostalLookup.result.settlements.length ? (
                      profilePostalLookup.result.settlements.length > 12 ? (
                        <>
                          <Input
                            id="profile-neighborhood"
                            className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                            autoComplete="address-level3"
                            list={neighborhoodListId}
                          value={resolvedProfile.neighborhood}
                            onChange={(e) => setProfile((current) => ({ ...current, neighborhood: e.target.value }))}
                          />
                          <datalist id={neighborhoodListId}>
                            {profilePostalLookup.result.settlements.map((settlement) => (
                              <option key={settlement} value={settlement} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <SelectWithCaret
                          id="profile-neighborhood"
                          className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                          value={resolvedProfile.neighborhood}
                          onChange={(e) => setProfile((current) => ({ ...current, neighborhood: e.target.value }))}
                        >
                          <option value="">Selecciona una colonia</option>
                          {profilePostalLookup.result.settlements.map((settlement) => (
                            <option key={settlement} value={settlement}>
                              {settlement}
                            </option>
                          ))}
                        </SelectWithCaret>
                      )
                    ) : (
                      <Input
                        id="profile-neighborhood"
                        className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                        autoComplete="address-level3"
                        value={resolvedProfile.neighborhood}
                        onChange={(e) => setProfile((current) => ({ ...current, neighborhood: e.target.value }))}
                      />
                    )}
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="profile-city">Ciudad</Label>
                    <Input
                      id="profile-city"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={resolvedProfile.city}
                      onChange={(e) => setProfile((current) => ({ ...current, city: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="profile-state">Estado</Label>
                    <SelectWithCaret
                      id="profile-state"
                      className="h-12 border-black/12 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      value={resolvedProfile.state}
                      onChange={(e) => setProfile((current) => ({ ...current, state: e.target.value }))}
                    >
                      <option value="">Selecciona tu estado</option>
                      {profileStateOptions.map((stateOption) => (
                        <option key={stateOption} value={stateOption}>
                          {stateOption}
                        </option>
                      ))}
                    </SelectWithCaret>
                  </div>
                  <div className="rounded-luxe border border-black/8 bg-white/82 px-4 py-3 text-sm text-ink-700 sm:col-span-2">
                    <p
                      className={[
                        "leading-6",
                        profilePostalLookup.status === "success"
                          ? "text-ink-800"
                          : profilePostalLookup.status === "loading"
                            ? "text-ink-700"
                            : profilePostalLookup.status === "error"
                              ? "text-ink-700"
                              : profilePostalCodeStatus.tone === "confirmed"
                                ? "text-ink-800"
                                : profilePostalCodeStatus.tone === "ready"
                                  ? "text-ink-700"
                                  : "text-ink-600"
                      ].join(" ")}
                    >
                      {profilePostalLookup.status === "loading"
                        ? "Consultando tu código postal..."
                        : profilePostalLookup.status === "success"
                          ? `Zona de entrega confirmada: ${profilePostalLookup.result.city || profilePostalLookup.result.municipality}, ${profilePostalLookup.result.state}.`
                          : profilePostalLookup.status === "error"
                            ? profilePostalLookup.error
                            : profilePostalCodeStatus.text}
                    </p>
                    {profilePostalLookup.status === "success" && profilePostalLookup.result.settlements.length ? (
                      <p className="mt-2 text-xs leading-5 text-ink-500">
                        {resolvedProfile.neighborhood.trim()
                          ? `Colonia seleccionada: ${resolvedProfile.neighborhood}.`
                          : `Colonias disponibles: ${profilePostalLookup.result.settlements.length}. Selecciona la tuya arriba.`}
                      </p>
                    ) : null}
                    {profilePostalLookup.status === "success" &&
                    profilePostalLookup.result.settlements.length > 12 &&
                    resolvedProfile.neighborhood.trim() &&
                    !profilePostalLookup.result.settlements.some(
                      (settlement) => normalizeLooseMatch(settlement) === normalizeLooseMatch(resolvedProfile.neighborhood)
                    ) ? (
                      <p className="mt-1 text-xs leading-5 text-ink-500">
                        La colonia escrita no coincide con las sugeridas para este código postal. Puedes continuar si es una variante.
                      </p>
                    ) : null}
                    {profilePostalLookup.status === "success" ? (
                      <p
                        className={[
                          "text-xs leading-5 text-ink-500",
                          profilePostalLookup.result.settlements.length ? "mt-1" : "mt-2"
                        ].join(" ")}
                      >
                        Municipio: {profilePostalLookup.result.municipality}
                        {profilePostalLookup.result.zone ? ` · Zona: ${profilePostalLookup.result.zone}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-luxe-xl border border-black/10 bg-gradient-to-r from-white to-ink-50/70 p-5 sm:p-6">
                  <div className="space-y-4">
                    <p className="max-w-2xl text-sm leading-6 text-ink-600">
                      Estos datos se usan para autocompletar tu siguiente checkout cuando compres con cuenta.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <ButtonLink href="/catalog" variant="outline" className="w-full whitespace-nowrap sm:w-auto">
                        Seguir comprando
                      </ButtonLink>
                      <Button
                        type="button"
                        variant="gold"
                        className="h-14 w-full px-8 text-[15px] font-semibold tracking-[0.08em] whitespace-nowrap text-white shadow-[0_14px_32px_rgba(188,149,79,0.18)] transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
                        disabled={isBusy}
                        onClick={onSaveProfile}
                      >
                        {status === "profile" ? "Guardando..." : "Guardar cambios"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="relative overflow-hidden p-4 shadow-[0_16px_42px_rgba(10,10,10,0.04)] transition-transform duration-200 ease-out hover:-translate-y-[1px] sm:p-5">
                <SignatureLine />
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-[linear-gradient(180deg,rgba(188,149,79,0.08),transparent)] lg:block" />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-section text-ink-500">RESUMEN</p>
                      <h2 className="mt-2 font-display text-2xl text-ink-950">Actividad reciente</h2>
                    </div>
                      <Button
                      type="button"
                      variant="outline"
                      className="h-10 border-black/10 px-4 text-[12px] font-medium tracking-[0.08em] text-ink-600 transition-all duration-200 hover:-translate-y-[1px] hover:border-black/18 hover:text-ink-900"
                      disabled={isBusy}
                      onClick={onLogout}
                    >
                      {status === "logout" ? "Cerrando..." : "Cerrar sesión ->"}
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-luxe-xl border border-black/8 bg-white/88 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">
                        {featuredOrder ? "Última compra" : "Último acceso"}
                      </p>
                      {featuredOrder && latestPurchaseItem ? (
                        <>
                          <p className="mt-1 text-sm font-medium text-ink-950">
                            {latestPurchaseItem.brand} {latestPurchaseItem.name}
                          </p>
                          <p className="mt-1 text-sm text-ink-700">{formatRelativeDate(latestPurchaseDate)}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm font-medium text-ink-950">
                          {customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Sesión actual"}
                        </p>
                      )}
                    </div>
                    <div className="rounded-luxe-xl border border-black/8 bg-white/88 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total invertido</p>
                      <p className="mt-1 text-sm font-medium text-ink-950">{spentLabel}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                id="orders"
                className="relative overflow-hidden p-5 shadow-[0_18px_46px_rgba(10,10,10,0.05)] transition-transform duration-200 ease-out hover:-translate-y-[1px] sm:p-7"
              >
                <SignatureLine />
                <div className="space-y-5">
                  <div>
                    <p className="text-xs tracking-section text-ink-500">PEDIDOS</p>
                    <h2 className="mt-2 font-display text-2xl text-ink-950">Tus órdenes</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-700">Aquí aparecen las órdenes nuevas asociadas a tu cuenta.</p>
                  </div>

                  {orders.length === 0 ? (
                    <div className="rounded-luxe-xl border border-black/8 bg-ink-50/55 px-4 py-5 text-sm leading-6 text-ink-700">
                      <p>Tu primera compra aparecerá aquí cuando esté lista.</p>
                      <ButtonLink
                        href="/catalog"
                        variant="outline"
                        className="mt-4 h-10 border-black/10 px-4 text-[12px] font-medium tracking-[0.08em] text-ink-600 transition-all duration-200 hover:-translate-y-[1px] hover:border-black/18 hover:text-ink-900"
                      >
                        Explorar catálogo -&gt;
                      </ButtonLink>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featuredOrder ? (
                        <div
                          id={`order-${featuredOrder.id}`}
                          className={[
                            "scroll-mt-28 rounded-luxe-xl p-5 transition-all duration-200 ease-luxe hover:-translate-y-[1px]",
                            highlightedOrderId === featuredOrder.id
                              ? "border border-antiqueGold/34 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(247,244,238,0.98))] shadow-[0_16px_38px_rgba(188,149,79,0.14)]"
                              : "border border-antiqueGold/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,244,238,0.92))] shadow-[0_12px_30px_rgba(10,10,10,0.04)] hover:shadow-[0_16px_34px_rgba(10,10,10,0.055)]"
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-xs tracking-section text-ink-500">PEDIDO DESTACADO</p>
                              <p className="text-sm font-medium text-ink-600">{formatCustomerOrderNumber(featuredOrder.id)}</p>
                              {featuredOrder.items[0] ? (
                                <>
                                  <p className="text-lg font-medium text-ink-950">
                                    {featuredOrder.items[0].brand} {featuredOrder.items[0].name}
                                  </p>
                                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-400">Estado actual</p>
                                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-500">
                                    {orderStatusSupportingLabel(featuredOrder)}
                                  </p>
                                  <p className="mt-0.5 text-sm text-ink-700">{featuredOrder.items[0].sizeMl} ml</p>
                                </>
                              ) : (
                                <p className="text-sm text-ink-700">Selección registrada</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                                {providerLabel(featuredOrder.provider)}
                              </span>
                              <span
                                className={[
                                  "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-all duration-300",
                                  highlightedOrderId === featuredOrder.id
                                    ? "bg-antiqueGold/18 text-ink-950 ring-1 ring-inset ring-antiqueGold/35 shadow-[0_0_0_1px_rgba(188,149,79,0.08),0_8px_18px_rgba(188,149,79,0.12)]"
                                    : "bg-ink-950 text-white"
                                ].join(" ")}
                              >
                                {orderStatusCustomerLabel(featuredOrder)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-ink-700 sm:grid-cols-3">
                            <div className="rounded-luxe border border-black/8 bg-white/78 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Fecha</p>
                              <p className="mt-1 font-medium text-ink-950">
                                {formatDate(featuredOrder.completedAt || featuredOrder.createdAt)}
                              </p>
                            </div>
                            <div className="rounded-luxe border border-black/8 bg-white/78 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Artículos</p>
                              <p className="mt-1 font-medium text-ink-950">
                                {featuredOrder.items.reduce((sum, item) => sum + item.quantity, 0)}
                              </p>
                            </div>
                            <div className="rounded-luxe border border-black/8 bg-white/78 px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total pagado</p>
                              <p className="mt-1 font-medium text-ink-950">{formatPrice(featuredOrder.subtotal)}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => toggleOrderDetails(featuredOrder.id)}
                              className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-4 py-2 text-[12px] font-medium tracking-[0.08em] text-ink-700 shadow-[0_8px_20px_rgba(10,10,10,0.03)] transition-all duration-200 ease-luxe hover:-translate-y-[1px] hover:border-black/16 hover:bg-white hover:text-ink-950 hover:shadow-[0_12px_24px_rgba(10,10,10,0.05)]"
                            >
                              {expandedOrderId === featuredOrder.id ? "Ocultar detalles" : "Ver detalles ->"}
                            </button>
                          </div>
                          {expandedOrderId === featuredOrder.id ? (
                            <div className="mt-4 space-y-3 border-t border-black/6 pt-4">
                              <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Entrega</p>
                                <p className="mt-1 text-sm text-ink-950">{orderDestinationLabel(featuredOrder)}</p>
                                <p className="mt-1 text-sm text-ink-700">{featuredOrder.customer.addressLine1}</p>
                              </div>
                              <div className="rounded-luxe border border-black/8 bg-white/80 px-4 py-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Productos</p>
                                <div className="mt-2 space-y-2">
                                  {featuredOrder.items.map((item) => (
                                    <div key={`${featuredOrder.id}-${item.perfumeId}-${item.sizeMl}`} className="flex items-center justify-between text-sm text-ink-700">
                                      <span>
                                        {item.brand} {item.name} {item.sizeMl} ml x{item.quantity}
                                      </span>
                                      <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {recentOrders.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs tracking-section text-ink-500">HISTORIAL RECIENTE</p>
                          {recentOrders.map((order) => (
                            <div
                              key={order.id}
                              id={`order-${order.id}`}
                              className={[
                                "scroll-mt-28 rounded-luxe-xl p-4 transition-all duration-200 ease-luxe hover:-translate-y-[1px]",
                                highlightedOrderId === order.id
                                  ? "border border-antiqueGold/28 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(247,244,238,0.94))] shadow-[0_14px_30px_rgba(188,149,79,0.12)]"
                                  : "border border-black/8 bg-white/90 shadow-[0_10px_24px_rgba(10,10,10,0.03)] hover:shadow-[0_14px_28px_rgba(10,10,10,0.05)]"
                              ].join(" ")}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs tracking-section text-ink-500">{providerLabel(order.provider)}</p>
                                  <p className="mt-1 text-sm font-medium text-ink-600">{formatCustomerOrderNumber(order.id)}</p>
                                  {order.items[0] ? (
                                    <>
                                      <p className="mt-2 font-medium text-ink-950">
                                        {order.items[0].brand} {order.items[0].name}
                                      </p>
                                      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-400">Estado actual</p>
                                      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-500">
                                        {orderStatusSupportingLabel(order)}
                                      </p>
                                      <p className="mt-0.5 text-sm text-ink-700">
                                        {order.items[0].sizeMl} ml · {formatDate(order.completedAt || order.createdAt)}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="mt-1 text-sm text-ink-700">{formatDate(order.completedAt || order.createdAt)}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex rounded-full bg-ink-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-700 ring-1 ring-inset ring-black/8">
                                    {order.checkoutMode === "account" ? "Cuenta" : "Invitado"}
                                  </span>
                                  <span
                                    className={[
                                      "inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-all duration-300",
                                      highlightedOrderId === order.id
                                        ? "bg-antiqueGold/18 text-ink-950 ring-1 ring-inset ring-antiqueGold/35 shadow-[0_0_0_1px_rgba(188,149,79,0.08),0_8px_18px_rgba(188,149,79,0.12)]"
                                        : "bg-ink-950 text-white"
                                    ].join(" ")}
                                  >
                                    {orderStatusCustomerLabel(order)}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between text-sm text-ink-700">
                                <span>Total pagado</span>
                                <span className="font-semibold text-ink-950">{formatPrice(order.subtotal)}</span>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleOrderDetails(order.id)}
                                  className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-4 py-2 text-[12px] font-medium tracking-[0.08em] text-ink-700 shadow-[0_8px_20px_rgba(10,10,10,0.03)] transition-all duration-200 ease-luxe hover:-translate-y-[1px] hover:border-black/16 hover:bg-white hover:text-ink-950 hover:shadow-[0_12px_24px_rgba(10,10,10,0.05)]"
                                >
                                  {expandedOrderId === order.id ? "Ocultar detalles" : "Ver detalles ->"}
                                </button>
                              </div>
                              {expandedOrderId === order.id ? (
                                <div className="mt-4 space-y-3 border-t border-black/6 pt-4">
                                  <div className="rounded-luxe border border-black/8 bg-white/82 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Entrega</p>
                                    <p className="mt-1 text-sm text-ink-950">{orderDestinationLabel(order)}</p>
                                    <p className="mt-1 text-sm text-ink-700">{order.customer.addressLine1}</p>
                                  </div>
                                  <div className="rounded-luxe border border-black/8 bg-white/82 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Productos</p>
                                    <div className="mt-2 space-y-2">
                                      {order.items.map((item) => (
                                        <div key={`${order.id}-${item.perfumeId}-${item.sizeMl}`} className="flex items-center justify-between text-sm text-ink-700">
                                          <span>
                                            {item.brand} {item.name} {item.sizeMl} ml x{item.quantity}
                                          </span>
                                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
