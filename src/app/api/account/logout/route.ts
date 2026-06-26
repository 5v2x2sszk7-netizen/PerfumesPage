import { jsonNoStoreOk } from "@/lib/apiResponse"
import { customerCookieName } from "@/lib/customerAuth"

export async function POST() {
  const res = jsonNoStoreOk({})
  res.cookies.set(customerCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  })
  return res
}
