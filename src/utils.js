const FLAG_OFFSET = 127397

export function getFlag(countryCode) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return
  return String.fromCodePoint(
    FLAG_OFFSET + countryCode.charCodeAt(0),
    FLAG_OFFSET + countryCode.charCodeAt(1)
  )
}
