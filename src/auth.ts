import NextAuth, { type Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { Provider } from "next-auth/providers"
import Apple from "next-auth/providers/apple"
import Google from "next-auth/providers/google"
import { ensureCustomerForOAuth } from "@/lib/customerAccount"
import { normalizeCustomerEmail } from "@/lib/customerAuth"
import { getAvailableSocialProviders, isSocialProvider } from "@/lib/socialAuth"

const availableProviders = getAvailableSocialProviders()
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.CUSTOMER_SESSION_SECRET?.trim() ||
  process.env.ADMIN_TOKEN?.trim() ||
  undefined

const providers: Provider[] = []

if (availableProviders.google) {
  providers.push(
    Google({
      allowDangerousEmailAccountLinking: true
    })
  )
}

if (availableProviders.apple) {
  providers.push(
    Apple({
      allowDangerousEmailAccountLinking: true
    })
  )
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: {
    strategy: "jwt"
  },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!account || !isSocialProvider(account.provider)) return false
      const email = normalizeCustomerEmail(user.email || (typeof profile?.email === "string" ? profile.email : ""))
      return Boolean(email && email.includes("@"))
    },
    async jwt({ token, account, profile, user }) {
      const nextToken = token as JWT & {
        customerId?: string
        provider?: string
      }

      if (account && isSocialProvider(account.provider)) {
        const email = normalizeCustomerEmail(user.email || (typeof profile?.email === "string" ? profile.email : ""))
        const fullName = user.name || (typeof profile?.name === "string" ? profile.name : null)

        if (email && account.providerAccountId) {
          const customer = await ensureCustomerForOAuth({
            email,
            fullName,
            provider: account.provider,
            providerAccountId: account.providerAccountId
          })

          nextToken.customerId = customer.id
          nextToken.email = customer.email
          nextToken.name = customer.profile.fullName
          nextToken.provider = account.provider
        }
      }

      return nextToken
    },
    async session({ session, token }) {
      const nextSession = session as Session & {
        customerId?: string
        provider?: string
      }

      if (typeof token.customerId === "string") {
        nextSession.customerId = token.customerId
      }

      if (typeof token.provider === "string") {
        nextSession.provider = token.provider
      }

      if (nextSession.user) {
        if (typeof token.email === "string") {
          nextSession.user.email = token.email
        }

        if (typeof token.name === "string") {
          nextSession.user.name = token.name
        }
      }

      return nextSession
    }
  }
})
