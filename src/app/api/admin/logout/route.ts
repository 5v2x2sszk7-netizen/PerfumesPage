import { adminCookieName } from "@/lib/adminSession"
import { jsonOk } from "@/lib/apiResponse"

export async function POST() {
  const res = jsonOk({})
  res.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  })
  return res
}
