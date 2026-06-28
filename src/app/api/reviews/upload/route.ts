import { jsonError } from "@/lib/apiResponse"
import { customerCookieName } from "@/lib/customerAuth"
import { readCustomerFromSessionValue } from "@/lib/customerAccount"
import { readEligibleReviewOrders } from "@/lib/reviewEligibility"
import { processUpload } from "@/lib/uploads/processUpload"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"
export const revalidate = 0

function readCookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") || ""
  const cookies = raw.split(/;\s*/)
  for (const entry of cookies) {
    const index = entry.indexOf("=")
    if (index === -1) continue
    const key = entry.slice(0, index).trim()
    if (key !== name) continue
    return decodeURIComponent(entry.slice(index + 1))
  }
  return ""
}

export async function POST(req: Request) {
  const sessionValue = readCookieValue(req, customerCookieName)
  const customer = await readCustomerFromSessionValue(sessionValue)
  if (!customer) {
    return jsonError("Inicia sesion con tu cuenta para subir fotos de reseña.", 401)
  }

  const eligibleOrders = await readEligibleReviewOrders(customer.id, customer.email)
  if (!eligibleOrders.length) {
    return jsonError("Solo puedes subir fotos si tienes una compra elegible para reseñar.", 403)
  }

  return processUpload(req, {
    maxSizeBytes: 2 * 1024 * 1024,
    baseNameFallback: "review",
    uploadSubdir: "reviews",
    maxDim: 1200,
    quality: 80,
    rateLimit: { keyPrefix: "reviews-upload", windowMs: 10 * 60 * 1000, max: 10 }
  })
}
