import { readOrders } from "@/lib/stores/orders"
import { readCustomerSessionValue } from "@/lib/customerAuth"
import { readCustomers, toPublicCustomer, type CustomerProfile } from "@/lib/stores/customers"

export type PublicCustomer = ReturnType<typeof toPublicCustomer>

export function normalizeCustomerProfileInput(
  input: Partial<CustomerProfile> | null | undefined,
  emailFallback = ""
): CustomerProfile | null {
  if (!input) return null

  const fullName = input.fullName?.trim() || ""
  const email = (input.email?.trim() || emailFallback).toLowerCase()
  const phone = input.phone?.trim() || ""
  const addressLine1 = input.addressLine1?.trim() || ""
  const addressLine2 = input.addressLine2?.trim() || ""
  const neighborhood = input.neighborhood?.trim() || ""
  const city = input.city?.trim() || ""
  const state = input.state?.trim() || ""
  const postalCode = input.postalCode?.trim() || ""

  if (!fullName || !email) return null

  return {
    fullName,
    email,
    phone,
    addressLine1,
    addressLine2,
    neighborhood,
    city,
    state,
    postalCode
  }
}

export function mergeCustomerProfile(base: CustomerProfile, overrides: Partial<CustomerProfile> | null | undefined) {
  if (!overrides) return base
  return {
    fullName: overrides.fullName?.trim() || base.fullName,
    email: overrides.email?.trim().toLowerCase() || base.email,
    phone: overrides.phone?.trim() || base.phone,
    addressLine1: overrides.addressLine1?.trim() || base.addressLine1,
    addressLine2: overrides.addressLine2?.trim() || base.addressLine2 || "",
    neighborhood: overrides.neighborhood?.trim() || base.neighborhood || "",
    city: overrides.city?.trim() || base.city,
    state: overrides.state?.trim() || base.state,
    postalCode: overrides.postalCode?.trim() || base.postalCode
  }
}

export async function readCustomerFromSessionValue(sessionValue: string | undefined | null) {
  const session = readCustomerSessionValue(sessionValue)
  if (!session) return null
  const customers = await readCustomers()
  const customer = customers.find((entry) => entry.id === session.customerId && entry.email === session.email)
  return customer ?? null
}

export async function readPublicCustomerFromSessionValue(sessionValue: string | undefined | null) {
  const customer = await readCustomerFromSessionValue(sessionValue)
  return customer ? toPublicCustomer(customer) : null
}

export async function readOrdersForCustomer(customerId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const orders = await readOrders()
  return orders.filter(
    (order) =>
      order.customerId === customerId ||
      (!order.customerId && order.customer?.email?.trim().toLowerCase() === normalizedEmail)
  )
}
