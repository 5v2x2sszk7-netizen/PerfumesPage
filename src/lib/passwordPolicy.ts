export const passwordPolicy = {
  minLength: 8
}

export function evaluatePassword(password: string) {
  const value = password || ""
  const lengthOk = value.length >= passwordPolicy.minLength
  const numberOk = /\d/.test(value)
  const specialOk = /[^A-Za-z0-9]/.test(value)
  const upperOk = /[A-Z]/.test(value)
  const lowerOk = /[a-z]/.test(value)
  const noSpaces = !/\s/.test(value)
  const ok = lengthOk && numberOk && specialOk && noSpaces
  const score = [lengthOk, numberOk, specialOk, upperOk, lowerOk, noSpaces].filter(Boolean).length

  let strengthLabel = "Muy debil"
  if (!value) strengthLabel = "Pendiente"
  else if (score >= 6) strengthLabel = "Muy segura"
  else if (score >= 5) strengthLabel = "Segura"
  else if (score >= 4) strengthLabel = "Media"
  else if (score >= 2) strengthLabel = "Debil"

  return {
    ok,
    lengthOk,
    numberOk,
    specialOk,
    upperOk,
    lowerOk,
    noSpaces,
    score,
    strengthLabel
  }
}

export function passwordPolicyHint() {
  return `Minimo ${passwordPolicy.minLength} caracteres, 1 numero, 1 caracter especial y sin espacios.`
}
