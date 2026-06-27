export const socialProviders = ["google", "apple"] as const

export type SocialProvider = (typeof socialProviders)[number]

function hasValue(value: string | undefined | null) {
  return Boolean(value?.trim())
}

export function isSocialProvider(value: string | undefined | null): value is SocialProvider {
  return value === "google" || value === "apple"
}

export function isAuthSecretConfigured() {
  return hasValue(process.env.AUTH_SECRET) || hasValue(process.env.CUSTOMER_SESSION_SECRET) || hasValue(process.env.ADMIN_TOKEN)
}

export function getAvailableSocialProviders() {
  const hasSecret = isAuthSecretConfigured()

  return {
    google: hasSecret && hasValue(process.env.AUTH_GOOGLE_ID) && hasValue(process.env.AUTH_GOOGLE_SECRET),
    apple: hasSecret && hasValue(process.env.AUTH_APPLE_ID) && hasValue(process.env.AUTH_APPLE_SECRET)
  } as const
}
