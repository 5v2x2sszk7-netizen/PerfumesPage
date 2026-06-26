import { jsonError, jsonOk } from "@/lib/apiResponse"
import { normalizePostalCodeInput, type PostalCodeLookupResult } from "@/lib/mxAddress"

export const runtime = "nodejs"

type SepomexRecord = {
  d_codigo?: string
  d_asenta?: string
  d_mnpio?: string
  d_estado?: string
  d_ciudad?: string
  d_zona?: string
}

type SepomexResponse = {
  data?: {
    total_records?: number
    postcodes?: SepomexRecord[]
  }
  error?: unknown
}

function normalizeLookup(records: SepomexRecord[], postalCode: string): PostalCodeLookupResult | null {
  if (!records.length) return null

  const first = records[0]
  const settlements = Array.from(
    new Set(
      records
        .map((record) => (typeof record.d_asenta === "string" ? record.d_asenta.trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))

  const state = typeof first.d_estado === "string" ? first.d_estado.trim() : ""
  const cityRaw = typeof first.d_ciudad === "string" ? first.d_ciudad.trim() : ""
  const municipality = typeof first.d_mnpio === "string" ? first.d_mnpio.trim() : ""

  return {
    postalCode,
    state,
    city: cityRaw || municipality,
    municipality,
    settlements,
    zone: typeof first.d_zona === "string" ? first.d_zona.trim() : undefined
  }
}

export async function GET(_: Request, context: { params: Promise<{ cp: string }> }) {
  const params = await context.params
  const postalCode = normalizePostalCodeInput(params.cp)
  if (postalCode.length !== 5) {
    return jsonError("Codigo postal invalido.", 400)
  }

  try {
    const response = await fetch(`https://sepomex.nitrostudio.com.mx/api/latest/cp/${postalCode}.json`, {
      next: { revalidate: 60 * 60 * 24 }
    })

    if (!response.ok) {
      return jsonError("No se pudo consultar el codigo postal.", 502)
    }

    const json = (await response.json().catch(() => null)) as SepomexResponse | null
    const records = Array.isArray(json?.data?.postcodes) ? json.data.postcodes : []
    const result = normalizeLookup(records, postalCode)

    if (!result) {
      return jsonError("No encontramos informacion para ese codigo postal.", 404)
    }

    return jsonOk({ result })
  } catch {
    return jsonError("No se pudo validar el codigo postal en este momento.", 502)
  }
}
