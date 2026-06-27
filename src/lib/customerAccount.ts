import { readOrders } from "@/lib/stores/orders"
import { normalizeCustomerEmail, readCustomerSessionValue } from "@/lib/customerAuth"
import {
  readCustomers,
  toPublicCustomer,
  type CustomerAuthProvider,
  type CustomerAuthProviderLink,
  type CustomerProfile,
  type CustomerRecord,
  withCustomersLock,
  writeCustomers
} from "@/lib/stores/customers"

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

function buildEmptyProfile(email: string, fullName: string): CustomerProfile {
  return {
    fullName,
    email,
    phone: "",
    addressLine1: "",
    addressLine2: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: ""
  }
}

function mergeAuthProviderLink(
  authProviders: CustomerAuthProviderLink[] | undefined,
  provider: CustomerAuthProvider,
  providerAccountId: string,
  now: string
) {
  const existingProviders = authProviders ?? []
  const providerIndex = existingProviders.findIndex(
    (entry) => entry.provider === provider || entry.providerAccountId === providerAccountId
  )

  if (providerIndex === -1) {
    return [
      ...existingProviders,
      {
        provider,
        providerAccountId,
        linkedAt: now,
        lastUsedAt: now
      }
    ]
  }

  const nextProviders = [...existingProviders]
  nextProviders[providerIndex] = {
    ...nextProviders[providerIndex],
    provider,
    providerAccountId,
    linkedAt: nextProviders[providerIndex].linkedAt || now,
    lastUsedAt: now
  }
  return nextProviders
}

export async function ensureCustomerForOAuth(input: {
  email: string
  fullName?: string | null
  provider: CustomerAuthProvider
  providerAccountId: string
}): Promise<CustomerRecord> {
  const email = normalizeCustomerEmail(input.email || "")
  const providerAccountId = input.providerAccountId.trim()
  const fullName = input.fullName?.trim() || email.split("@")[0] || "Cliente"

  if (!email || !email.includes("@")) {
    throw new Error("La cuenta social no devolvió un correo válido.")
  }

  if (!providerAccountId) {
    throw new Error("La cuenta social no devolvió un identificador válido.")
  }

  let ensuredCustomer: CustomerRecord | null = null
  await withCustomersLock(async () => {
    const customers = await readCustomers()
    const customerIndex = customers.findIndex((entry) => entry.email === email)
    const now = new Date().toISOString()

    if (customerIndex >= 0) {
      const current = customers[customerIndex]
      ensuredCustomer = {
        ...current,
        updatedAt: now,
        lastLoginAt: now,
        authProviders: mergeAuthProviderLink(current.authProviders, input.provider, providerAccountId, now),
        profile: {
          ...current.profile,
          fullName: current.profile.fullName.trim() || fullName,
          email
        }
      }
      customers[customerIndex] = ensuredCustomer
      await writeCustomers(customers)
      return
    }

    const createdCustomer: CustomerRecord = {
      id: globalThis.crypto?.randomUUID?.() || `customer-${Date.now()}`,
      email,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      authProviders: mergeAuthProviderLink(undefined, input.provider, providerAccountId, now),
      profile: buildEmptyProfile(email, fullName)
    }
    ensuredCustomer = createdCustomer

    await writeCustomers([createdCustomer, ...customers])
  })

  if (!ensuredCustomer) {
    throw new Error("No se pudo preparar la cuenta social.")
  }

  return ensuredCustomer
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
