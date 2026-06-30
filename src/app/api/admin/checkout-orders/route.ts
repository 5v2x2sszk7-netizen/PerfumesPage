import { revalidatePath } from "next/cache"
import { jsonError, jsonOk, readJsonBody } from "@/lib/apiResponse"
import { releaseExpiredCheckoutOrderReservations } from "@/lib/stores/checkoutOrders"

export const runtime = "nodejs"

type BulkUpdateCheckoutOrdersBody = {
  action?: string
}

function revalidateShopInventory() {
  revalidatePath("/")
  revalidatePath("/catalog")
  revalidatePath("/catalog/[slug]", "page")
}

export async function PUT(req: Request) {
  const body = await readJsonBody<BulkUpdateCheckoutOrdersBody>(req)
  if (!body) return jsonError("Invalid body", 400)

  if (body.action !== "release_expired_reservations") {
    return jsonError("Accion invalida.", 400)
  }

  const result = await releaseExpiredCheckoutOrderReservations()
  revalidateShopInventory()

  return jsonOk({
    releasedCount: result.releasedCount
  })
}
