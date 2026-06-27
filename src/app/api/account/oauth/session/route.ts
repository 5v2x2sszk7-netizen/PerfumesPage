import { auth } from "@/auth"
import { jsonError, jsonNoStoreOk } from "@/lib/apiResponse"
import { createCustomerSessionValue, customerCookieName, normalizeCustomerEmail } from "@/lib/customerAuth"
import { readCustomers, toPublicCustomer } from "@/lib/stores/customers"

type AuthSessionWithCustomer = {
  customerId?: string
  user?: {
    email?: string | null
  }
}

export async function POST() {
  const session = (await auth()) as AuthSessionWithCustomer | null
  const email = normalizeCustomerEmail(session?.user?.email || "")
  const customerId = typeof session?.customerId === "string" ? session.customerId.trim() : ""

  if (!email || !email.includes("@")) {
    return jsonError("No encontramos una sesión social activa.", 401)
  }

  const customers = await readCustomers()
  const customer = customers.find((entry) => (customerId ? entry.id === customerId : true) && entry.email === email)

  if (!customer) {
    return jsonError("No pudimos vincular la sesión social con tu cuenta.", 404)
  }

  const response = jsonNoStoreOk({
    customer: toPublicCustomer(customer)
  })

  response.cookies.set(customerCookieName, createCustomerSessionValue({ customerId: customer.id, email: customer.email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  })

  return response
}
