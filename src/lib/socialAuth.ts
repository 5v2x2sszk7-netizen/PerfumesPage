export const socialProviders = ["google"] as const

export type SocialProvider = (typeof socialProviders)[number]

function hasValue(value: string | undefined | null) {
  return Boolean(value?.trim())
}

export function isSocialProvider(value: string | undefined | null): value is SocialProvider {
  return value === "google"
}

export function isAuthSecretConfigured() {
  return hasValue(process.env.AUTH_SECRET) || hasValue(process.env.CUSTOMER_SESSION_SECRET)
}

export function getAvailableSocialProviders() {
  const hasSecret = isAuthSecretConfigured()

  return {
    google: hasSecret && hasValue(process.env.AUTH_GOOGLE_ID) && hasValue(process.env.AUTH_GOOGLE_SECRET)
  } as const
}
