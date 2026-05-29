export function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
  return letters || "C"
}

export function formatCustomerDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "Cliente"
  if (parts.length === 1) return `${parts[0]![0]!.toUpperCase()}.`
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  return `${first} ${last[0]!.toUpperCase()}.`
}
