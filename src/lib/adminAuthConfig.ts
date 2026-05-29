export const adminCookieName = "malo_admin"

export const adminSessionMessage = "admin-session"

export function expectedAdminToken() {
  return (process.env.ADMIN_TOKEN ?? "").trim()
}
