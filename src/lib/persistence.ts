class PersistenceNotConfiguredError extends Error {
  code = "PERSISTENCE_NOT_CONFIGURED" as const

  constructor(message: string) {
    super(message)
    this.name = "PersistenceNotConfiguredError"
  }
}

export function isPersistenceNotConfiguredError(
  err: unknown
): err is Error & { code: "PERSISTENCE_NOT_CONFIGURED" } {
  return err instanceof PersistenceNotConfiguredError
}

export function ensureFsWritesAllowed(scope: "data" | "uploads") {
  if (process.env.NODE_ENV !== "production") return
  if (process.env.PERFIMES_ALLOW_FS_WRITE === "1") return

  const target = scope === "uploads" ? "imágenes" : "datos"
  throw new PersistenceNotConfiguredError(
    `Persistencia no configurada para producción (${target}). ` +
      `En Vercel/Netlify el filesystem no es persistente. ` +
      `Configura almacenamiento persistente (por ejemplo Upstash Redis para datos y blob storage para imágenes) o define PERFIMES_ALLOW_FS_WRITE=1 ` +
      `si despliegas en un servidor con disco persistente.`
  )
}
