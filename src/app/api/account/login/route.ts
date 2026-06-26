import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import {
  createCustomerSessionValue,
  customerCookieName,
  normalizeCustomerEmail,
  verifyCustomerPassword
} from "@/lib/customerAuth"
import { checkRateLimit } from "@/lib/rateLimit"
import { readCustomers, toPublicCustomer, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(req: Request) {
  const rate = await checkRateLimit(req, { keyPrefix: "customer-login", windowMs: 10 * 60 * 1000, max: 25 })
  if (!rate.allowed) {
    return jsonError("Demasiados intentos. Intenta de nuevo en unos minutos.", 429, {
      headers: {
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000))
      }
    })
  }

  const body = await readJsonBody<LoginBody>(req)
  const email = normalizeCustomerEmail(body?.email || "")
  const password = body?.password || ""
  if (!email || !email.includes("@") || !password) return jsonError("Ingresa tu correo y contrasena.", 400)

  const customers = await readCustomers()
  const customer = customers.find((entry) => entry.email === email)
  if (!customer) return jsonError("No encontramos una cuenta con ese correo.", 404)

  const isValidPassword = await verifyCustomerPassword(password, customer.passwordHash, customer.passwordSalt)
  if (!isValidPassword) return jsonError("La contrasena es incorrecta.", 401)

  let signedInCustomer = customer
  await withCustomersLock(async () => {
    const nextCustomers = await readCustomers()
    const customerIndex = nextCustomers.findIndex((entry) => entry.id === customer.id)
    if (customerIndex === -1) return

    signedInCustomer = {
      ...nextCustomers[customerIndex],
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    nextCustomers[customerIndex] = signedInCustomer
    await writeCustomers(nextCustomers)
  })

  const res = jsonNoStoreOk({
    customer: toPublicCustomer(signedInCustomer)
  })
  res.cookies.set(
    customerCookieName,
    createCustomerSessionValue({ customerId: signedInCustomer.id, email: signedInCustomer.email }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    }
  )
  return res
}
