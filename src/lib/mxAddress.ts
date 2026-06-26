const baseMxStates = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de Mexico",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de Mexico",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacan",
  "Morelos",
  "Nayarit",
  "Nuevo Leon",
  "Oaxaca",
  "Puebla",
  "Queretaro",
  "Quintana Roo",
  "San Luis Potosi",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatan",
  "Zacatecas"
] as const

export const mxStates = [...baseMxStates]

export type PostalCodeLookupResult = {
  postalCode: string
  state: string
  city: string
  municipality: string
  settlements: string[]
  zone?: string
}

export function normalizePostalCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 5)
}

export function buildMxStateOptions(currentValue: string) {
  const trimmed = currentValue.trim()
  if (!trimmed) return mxStates
  return mxStates.some((state) => state === trimmed) ? mxStates : [trimmed, ...mxStates]
}

export function getPostalCodeHelper(postalCode: string, state: string) {
  const normalizedPostalCode = normalizePostalCodeInput(postalCode)
  const trimmedState = state.trim()

  if (!normalizedPostalCode) {
    return {
      tone: "neutral" as const,
      text: "Ingresa 5 digitos para confirmar tu zona de envio."
    }
  }

  if (normalizedPostalCode.length < 5) {
    return {
      tone: "pending" as const,
      text: `Faltan ${5 - normalizedPostalCode.length} digito(s) para completar tu codigo postal.`
    }
  }

  if (!trimmedState) {
    return {
      tone: "ready" as const,
      text: "Codigo postal listo. Ahora selecciona tu estado."
    }
  }

  return {
    tone: "confirmed" as const,
    text: `Zona de entrega registrada: ${trimmedState}, CP ${normalizedPostalCode}.`
  }
}
