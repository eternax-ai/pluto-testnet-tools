/**
 * SILMARILS auth nonce for transfer/record payloads — not the FRAME account nonce.
 * Binds evaluation points; must be unique per signed payload you care about.
 */

export function transferAuthNonce(): bigint {
  const explicit = process.env.PLUTO_AUTH_NONCE?.trim()
  if (explicit) return BigInt(explicit)
  return BigInt(Date.now())
}

export function recordNonce(): bigint {
  const explicit = process.env.PLUTO_NONCE?.trim()
  if (explicit) return BigInt(explicit)
  return BigInt(Date.now())
}
