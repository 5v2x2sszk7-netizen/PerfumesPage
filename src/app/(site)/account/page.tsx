import type { Metadata } from "next"
import { cookies } from "next/headers"
import { AccountPageClient } from "./AccountPageClient"
import { customerCookieName } from "@/lib/customerAuth"
import { readOrdersForCustomer, readPublicCustomerFromSessionValue } from "@/lib/customerAccount"
import { getAvailableSocialProviders } from "@/lib/socialAuth"

export const metadata: Metadata = {
  title: "Cuenta | MALO Fragances"
}

export default async function AccountPage() {
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(customerCookieName)?.value
  const customer = await readPublicCustomerFromSessionValue(sessionValue)
  const orders = customer ? await readOrdersForCustomer(customer.id, customer.email) : []
  const availableSocialProviders = getAvailableSocialProviders()

  return (
    <AccountPageClient
      initialCustomer={customer}
      initialOrders={orders}
      socialProviders={availableSocialProviders}
    />
  )
}
