import { readReviews } from "@/lib/perfumeStore"
import { jsonError, jsonNoStoreOk } from "@/lib/apiResponse"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const reviews = await readReviews()
  return jsonNoStoreOk({ reviews })
}

export async function POST() {
  return jsonError("Las reseñas solo pueden crearse desde cuentas con compra verificada.", 403)
}
