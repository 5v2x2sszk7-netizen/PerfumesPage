"use client"

import { useEffect, useMemo, useState } from "react"
import { Container } from "@/components/ui/Container"
import { Card } from "@/components/ui/Surface"
import { Input, Label } from "@/components/ui/Field"
import { Button, ButtonLink } from "@/components/ui/Button"
import { evaluatePassword, passwordPolicyHint } from "@/lib/passwordPolicy"

type ResetPasswordValidationResponse = {
  ok?: boolean
  error?: string
  valid?: boolean
  emailHint?: string
  expiresAt?: string
}

type ResetPasswordSubmitResponse = {
  ok?: boolean
  error?: string
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
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

function PasswordStrengthMeter({ score, label }: { score: number; label: string }) {
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

export function ResetPasswordPageClient({ token }: { token: string }) {
  const [status, setStatus] = useState<"checking" | "idle" | "submitting" | "success">("checking")
  const [isValidToken, setIsValidToken] = useState(false)
  const [emailHint, setEmailHint] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const passwordEval = evaluatePassword(password)
  const expiresAtLabel = useMemo(() => {
    if (!expiresAt) return ""

    try {
      return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(expiresAt))
    } catch {
      return expiresAt
    }
  }, [expiresAt])

  useEffect(() => {
    let cancelled = false

    async function validateToken() {
      if (!token.trim()) {
        if (!cancelled) {
          setIsValidToken(false)
          setError("El enlace de recuperación no es válido.")
          setStatus("idle")
        }
        return
      }

      try {
        const response = await fetch(`/api/account/password/reset?token=${encodeURIComponent(token)}`, {
          cache: "no-store"
        })
        const json = await readJson<ResetPasswordValidationResponse>(response)
        if (!response.ok || !json?.ok || !json.valid) {
          throw new Error(json?.error || "El enlace de recuperación no es válido o ya expiró.")
        }

        if (!cancelled) {
          setIsValidToken(true)
          setEmailHint(json.emailHint || "")
          setExpiresAt(json.expiresAt || "")
          setError("")
          setStatus("idle")
        }
      } catch (validationError) {
        if (!cancelled) {
          setIsValidToken(false)
          setError(validationError instanceof Error ? validationError.message : "No se pudo validar el enlace.")
          setStatus("idle")
        }
      }
    }

    validateToken()
    return () => {
      cancelled = true
    }
  }, [token])

  async function onSubmit() {
    setError("")
    setMessage("")

    if (!isValidToken) {
      setError("El enlace de recuperación ya no es válido.")
      return
    }

    if (!passwordEval.ok) {
      setError(`Contraseña inválida. ${passwordPolicyHint()}`)
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setStatus("submitting")
    try {
      const response = await fetch("/api/account/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          password
        })
      })
      const json = await readJson<ResetPasswordSubmitResponse>(response)
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo restablecer tu contraseña.")
      }

      setMessage("Tu contraseña quedó actualizada y tu sesión ya está iniciada.")
      setPassword("")
      setConfirmPassword("")
      setStatus("success")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo restablecer tu contraseña.")
      setStatus("idle")
    }
  }

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="overflow-hidden rounded-luxe-xl border border-black/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(247,244,238,0.94))] shadow-[0_18px_50px_rgba(10,10,10,0.05)]">
          <div className="border-b border-black/6 px-5 py-4 sm:px-7">
            <p className="text-[11px] tracking-section text-ink-400">SEGURIDAD</p>
            <h1 className="mt-2 font-display text-3xl leading-none text-ink-950 sm:text-[2.8rem]">Restablece tu contraseña</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-700">
              Elige una contraseña nueva y vuelve a entrar a tu cuenta sin fricción.
            </p>
          </div>
          <div className="grid gap-3 px-5 py-3 text-sm text-ink-600 sm:grid-cols-3 sm:px-7">
            <p className="leading-6">El enlace es único y temporal.</p>
            <p className="leading-6">Tu nueva contraseña debe ser segura y fácil de recordar.</p>
            <p className="leading-6">Cuando termines, tu sesión quedará iniciada automáticamente.</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-luxe-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</div>
        ) : null}

        {message ? (
          <div className="rounded-luxe-xl border border-antiqueGold/25 bg-[linear-gradient(135deg,rgba(251,248,241,0.96),rgba(247,243,233,0.92))] px-4 py-3 text-sm leading-6 text-ink-700 shadow-[0_12px_28px_rgba(188,149,79,0.08)]">
            {message}
          </div>
        ) : null}

        <Card className="p-5 shadow-[0_16px_42px_rgba(10,10,10,0.04)] sm:p-7">
          {status === "checking" ? (
            <div className="space-y-3">
              <p className="text-xs tracking-section text-ink-500">VALIDANDO</p>
              <h2 className="font-display text-2xl text-ink-950">Revisando tu enlace</h2>
              <p className="text-sm leading-6 text-ink-700">Un momento, estamos confirmando que el acceso siga vigente.</p>
            </div>
          ) : isValidToken ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs tracking-section text-ink-500">NUEVA CONTRASEÑA</p>
                <h2 className="font-display text-2xl text-ink-950">Tu cuenta está lista para actualizarse</h2>
                <p className="max-w-xl text-sm leading-6 text-ink-700">
                  {emailHint ? `Acceso solicitado para ${emailHint}. ` : ""}
                  {expiresAtLabel ? `Este enlace vence el ${expiresAtLabel}.` : ""}
                </p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="reset-password">Contraseña nueva</Label>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="h-12 border-black/12 pr-16 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      placeholder="••••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <PasswordStrengthMeter score={passwordEval.score} label={passwordEval.strengthLabel} />
                  <div className="grid gap-2 rounded-luxe-xl border border-black/10 bg-white/70 px-4 py-3 text-xs sm:grid-cols-2">
                    <RequirementItem ok={passwordEval.lengthOk} label="8+ caracteres" />
                    <RequirementItem ok={passwordEval.numberOk} label="1 número" />
                    <RequirementItem ok={passwordEval.specialOk} label="1 carácter especial" />
                    <RequirementItem ok={passwordEval.noSpaces} label="Sin espacios" />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="reset-confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="reset-confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="h-12 border-black/12 pr-16 shadow-[0_8px_18px_rgba(10,10,10,0.03)]"
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-4 my-auto inline-flex h-8 items-center justify-center text-[11px] font-medium tracking-[0.08em] text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {showConfirmPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="gold"
                    className="h-14 whitespace-nowrap px-7 text-[15px] font-semibold tracking-[0.08em] text-white shadow-[0_14px_32px_rgba(188,149,79,0.18)]"
                    disabled={
                      status === "submitting" ||
                      status === "success" ||
                      !passwordEval.ok ||
                      !confirmPassword.trim() ||
                      password !== confirmPassword
                    }
                    onClick={onSubmit}
                  >
                    {status === "submitting" ? "Guardando..." : status === "success" ? "Actualizado" : "Guardar nueva contraseña"}
                  </Button>
                  <ButtonLink href="/account" variant="outline" className="h-14 whitespace-nowrap px-6">
                    Ir a mi cuenta
                  </ButtonLink>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs tracking-section text-ink-500">ENLACE INVÁLIDO</p>
                <h2 className="font-display text-2xl text-ink-950">Solicita uno nuevo</h2>
                <p className="max-w-xl text-sm leading-6 text-ink-700">
                  El acceso pudo haber expirado o ya se utilizó. Puedes generar un enlace nuevo en segundos.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <ButtonLink href="/account/recover" variant="gold" className="h-14 whitespace-nowrap px-7 text-[15px] font-semibold tracking-[0.08em] text-white">
                  Solicitar otro enlace
                </ButtonLink>
                <ButtonLink href="/account" variant="outline" className="h-14 whitespace-nowrap px-6">
                  Volver al acceso
                </ButtonLink>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Container>
  )
}
