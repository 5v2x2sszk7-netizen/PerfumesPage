import type { Metadata } from "next"
import { cookies } from "next/headers"
import { CheckoutPageClient } from "@/app/(site)/checkout/CheckoutPageClient"
import { toCartItem } from "@/lib/cart"
import { customerCookieName } from "@/lib/customerAuth"
import { readPublicCustomerFromSessionValue } from "@/lib/customerAccount"
import { getPaymentProviderAvailability } from "@/lib/payments"
import { readPerfumesCached } from "@/lib/perfumeStore"

export const metadata: Metadata = {
  title: "Checkout | MALO Fragances"
}

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ buyNow?: string }>
}) {
  const { buyNow } = await searchParams
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(customerCookieName)?.value
  const customer = await readPublicCustomerFromSessionValue(sessionValue)
  const perfumes = buyNow ? await readPerfumesCached() : []
  const directPerfume = buyNow
    ? perfumes.find((perfume) => perfume.slug === buyNow || perfume.id === buyNow || perfume.id.startsWith(`${buyNow}-`))
    : undefined

  return (
    <CheckoutPageClient
      buyNowItem={directPerfume ? toCartItem(directPerfume) : null}
      initialCustomer={customer}
      providers={getPaymentProviderAvailability()}
    />
  )
}
