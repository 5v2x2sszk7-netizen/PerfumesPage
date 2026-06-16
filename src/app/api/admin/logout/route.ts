import { adminCookieName } from "@/lib/adminSession"
import { jsonOk } from "@/lib/apiResponse"

function isHttpsRequest(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.trim().toLowerCase()
  if (forwardedProto === "https") return true
  if (forwardedProto === "http") return false
  return req.url.startsWith("https://")
}

export async function POST(req: Request) {
  const res = jsonOk({})
  res.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(req),
    path: "/",
    maxAge: 0
  })
  return res
}
