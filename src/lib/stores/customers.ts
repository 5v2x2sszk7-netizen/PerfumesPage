import { dataFilePath, readJsonArrayResult, withStorageLock, writeJson } from "@/lib/storage/jsonFile"

export type CustomerProfile = {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
}

export type CustomerAuthProvider = "google" | "apple"

export type CustomerAuthProviderLink = {
  provider: CustomerAuthProvider
  providerAccountId: string
  linkedAt: string
  lastUsedAt?: string
}

export type CustomerRecord = {
  id: string
  email: string
  passwordHash?: string
  passwordSalt?: string
  passwordResetTokenHash?: string
  passwordResetExpiresAt?: string
  passwordResetRequestedAt?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  authProviders?: CustomerAuthProviderLink[]
  profile: CustomerProfile
}

const customersPath = dataFilePath("customers.json")

function normalizeProfile(input: unknown): CustomerProfile | null {
  if (!input || typeof input !== "object") return null
  const profile = input as Record<string, unknown>

  const fullName = typeof profile.fullName === "string" ? profile.fullName.trim() : ""
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : ""
  const phone = typeof profile.phone === "string" ? profile.phone.trim() : ""
  const addressLine1 = typeof profile.addressLine1 === "string" ? profile.addressLine1.trim() : ""
  const addressLine2 = typeof profile.addressLine2 === "string" ? profile.addressLine2.trim() : undefined
  const neighborhood = typeof profile.neighborhood === "string" ? profile.neighborhood.trim() : ""
  const city = typeof profile.city === "string" ? profile.city.trim() : ""
  const state = typeof profile.state === "string" ? profile.state.trim() : ""
  const postalCode = typeof profile.postalCode === "string" ? profile.postalCode.trim() : ""

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

function normalizeAuthProvider(value: unknown): CustomerAuthProvider | null {
  if (value === "google" || value === "apple") return value
  return null
}

function normalizeAuthProviders(input: unknown) {
  if (!Array.isArray(input)) return undefined

  const providers = input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const record = entry as Record<string, unknown>
      const provider = normalizeAuthProvider(record.provider)
      const providerAccountId =
        typeof record.providerAccountId === "string" ? record.providerAccountId.trim() : ""
      const linkedAt = typeof record.linkedAt === "string" ? record.linkedAt : ""
      const lastUsedAt = typeof record.lastUsedAt === "string" ? record.lastUsedAt : undefined

      if (!provider || !providerAccountId || !linkedAt) return null

      return {
        provider,
        providerAccountId,
        linkedAt,
        lastUsedAt
      }
    })
    .filter(Boolean) as CustomerAuthProviderLink[]

  if (!providers.length) return undefined

  const deduped = new Map<string, CustomerAuthProviderLink>()
  for (const provider of providers) {
    const key = `${provider.provider}:${provider.providerAccountId}`
    deduped.set(key, provider)
  }

  return Array.from(deduped.values())
}

function normalizeCustomerRecord(input: unknown): CustomerRecord | null {
  if (!input || typeof input !== "object") return null
  const record = input as Record<string, unknown>

  const id = typeof record.id === "string" ? record.id.trim() : ""
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : ""
  const passwordHash = typeof record.passwordHash === "string" ? record.passwordHash.trim() || undefined : undefined
  const passwordSalt = typeof record.passwordSalt === "string" ? record.passwordSalt.trim() || undefined : undefined
  const passwordResetTokenHash =
    typeof record.passwordResetTokenHash === "string" ? record.passwordResetTokenHash.trim() || undefined : undefined
  const passwordResetExpiresAt =
    typeof record.passwordResetExpiresAt === "string" ? record.passwordResetExpiresAt.trim() || undefined : undefined
  const passwordResetRequestedAt =
    typeof record.passwordResetRequestedAt === "string" ? record.passwordResetRequestedAt.trim() || undefined : undefined
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : ""
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : ""
  const lastLoginAt = typeof record.lastLoginAt === "string" ? record.lastLoginAt : undefined
  const authProviders = normalizeAuthProviders(record.authProviders)
  const profile = normalizeProfile(record.profile)

  if (!id || !email || !createdAt || !updatedAt || !profile) return null

  return {
    id,
    email,
    passwordHash,
    passwordSalt,
    passwordResetTokenHash,
    passwordResetExpiresAt,
    passwordResetRequestedAt,
    createdAt,
    updatedAt,
    lastLoginAt,
    authProviders,
    profile: {
      ...profile,
      email
    }
  }
}

export function toPublicCustomer(customer: CustomerRecord) {
  return {
    id: customer.id,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    lastLoginAt: customer.lastLoginAt,
    profile: customer.profile
  }
}

export async function readCustomers() {
  const res = await readJsonArrayResult<unknown>(customersPath)
  if (res.status === "missing" || res.status === "invalid" || res.status === "error") {
    return []
  }
  return res.value.map(normalizeCustomerRecord).filter(Boolean) as CustomerRecord[]
}

export async function writeCustomers(customers: CustomerRecord[]) {
  await writeJson(customersPath, customers)
}

export async function withCustomersLock<T>(fn: () => Promise<T>): Promise<T> {
  return withStorageLock(customersPath, fn)
}
