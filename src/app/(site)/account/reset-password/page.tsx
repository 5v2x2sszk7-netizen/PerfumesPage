import type { Metadata } from "next"
import { ResetPasswordPageClient } from "./ResetPasswordPageClient"

export const metadata: Metadata = {
  title: "Restablecer contraseña | MALO Fragances"
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : ""

  return <ResetPasswordPageClient token={token} />
}
