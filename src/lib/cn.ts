export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const focusRing =
  "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-antiqueGold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
