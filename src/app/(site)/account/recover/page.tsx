import type { Metadata } from "next"
import { RecoverPasswordPageClient } from "./RecoverPasswordPageClient"

export const metadata: Metadata = {
  title: "Recuperar acceso | MALO Fragances"
}

export default async function RecoverPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === "string" ? params.email : ""

  return <RecoverPasswordPageClient initialEmail={email} />
}
