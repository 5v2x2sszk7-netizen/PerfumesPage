import { cookies } from "next/headers"
import { jsonNoStoreOk } from "@/lib/apiResponse"
import { customerCookieName } from "@/lib/customerAuth"
import { readOrdersForCustomer, readPublicCustomerFromSessionValue } from "@/lib/customerAccount"

export async function GET() {
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(customerCookieName)?.value
  const customer = await readPublicCustomerFromSessionValue(sessionValue)

  if (!customer) {
    return jsonNoStoreOk({
      customer: null,
      orders: []
    })
  }

  return jsonNoStoreOk({
    customer,
    orders: await readOrdersForCustomer(customer.id, customer.email)
  })
}
