import type { Metadata } from "next"
import { CheckoutReturnClient } from "@/app/(site)/checkout/return/CheckoutReturnClient"
import type { CheckoutProvider } from "@/lib/payments"

export const metadata: Metadata = {
  title: "Resultado del pago | MALO Fragances"
}

export default async function CheckoutReturnPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const providerValue = typeof params.provider === "string" ? params.provider : null
  const provider = providerValue === "mercado_pago" || providerValue === "paypal" ? (providerValue as CheckoutProvider) : null
  const status = typeof params.status === "string" ? params.status : ""
  const orderId = typeof params.token === "string" ? params.token : ""
  const paymentId = typeof params.payment_id === "string" ? params.payment_id : ""
  const collectionId = typeof params.collection_id === "string" ? params.collection_id : ""
  const merchantOrderId = typeof params.merchant_order_id === "string" ? params.merchant_order_id : ""
  const externalReference = typeof params.external_reference === "string" ? params.external_reference : ""

  return (
    <CheckoutReturnClient
      provider={provider}
      status={status}
      orderId={orderId}
      paymentId={paymentId}
      collectionId={collectionId}
      merchantOrderId={merchantOrderId}
      externalReference={externalReference}
    />
  )
}
