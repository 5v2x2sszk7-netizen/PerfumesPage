import { cookies } from "next/headers"
import { jsonError, jsonNoStoreOk, readJsonBody } from "@/lib/apiResponse"
import { customerCookieName } from "@/lib/customerAuth"
import { normalizeCustomerProfileInput, readCustomerFromSessionValue } from "@/lib/customerAccount"
import { readCustomers, toPublicCustomer, withCustomersLock, writeCustomers } from "@/lib/stores/customers"

type ProfileBody = {
  profile?: {
    fullName?: string
    email?: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    neighborhood?: string
    city?: string
    state?: string
    postalCode?: string
  }
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(customerCookieName)?.value
  const sessionCustomer = await readCustomerFromSessionValue(sessionValue)
  if (!sessionCustomer) return jsonError("Inicia sesion para actualizar tu cuenta.", 401)

  const body = await readJsonBody<ProfileBody>(req)
  const profile = normalizeCustomerProfileInput(body?.profile, sessionCustomer.email)
  if (!profile) return jsonError("Completa al menos tu nombre para guardar el perfil.", 400)

  let updated = null
  await withCustomersLock(async () => {
    const customers = await readCustomers()
    const customerIndex = customers.findIndex((entry) => entry.id === sessionCustomer.id)
    if (customerIndex === -1) return

    updated = {
      ...customers[customerIndex],
      updatedAt: new Date().toISOString(),
      profile: {
        ...profile,
        email: customers[customerIndex].email
      }
    }
    customers[customerIndex] = updated
    await writeCustomers(customers)
  })

  if (!updated) return jsonError("No se pudo actualizar tu cuenta.", 404)
  return jsonNoStoreOk({
    customer: toPublicCustomer(updated)
  })
}
