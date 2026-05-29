/**
 * SCALE encoding for eternax_primitives testnet payloads (fixed-width LE fields).
 */

function writeU64LE(buf: Uint8Array, offset: number, value: bigint): void {
  for (let i = 0; i < 8; i++) {
    buf[offset + i] = Number((value >> BigInt(i * 8)) & 0xffn)
  }
}

function writeU128LE(buf: Uint8Array, offset: number, value: bigint): void {
  for (let i = 0; i < 16; i++) {
    buf[offset + i] = Number((value >> BigInt(i * 8)) & 0xffn)
  }
}

/** TestnetTransferPayload: auth_nonce (u64) || value (u128) || dest (20 bytes) */
export function encodeTransferPayload(authNonce: bigint, value: bigint, dest: Uint8Array): Uint8Array {
  if (dest.length !== 20) {
    throw new Error(`dest must be 20 bytes (got ${dest.length})`)
  }
  const buf = new Uint8Array(8 + 16 + 20)
  writeU64LE(buf, 0, authNonce)
  writeU128LE(buf, 8, value)
  buf.set(dest, 24)
  return buf
}

/** TestnetTransactionPayload: nonce (u64) || amount (u128) || recipient (32 bytes) */
export function encodeTransactionPayload(nonce: bigint, amount: bigint, recipient: Uint8Array): Uint8Array {
  if (recipient.length !== 32) {
    throw new Error(`recipient must be 32 bytes (got ${recipient.length})`)
  }
  const buf = new Uint8Array(8 + 16 + 32)
  writeU64LE(buf, 0, nonce)
  writeU128LE(buf, 8, amount)
  buf.set(recipient, 24)
  return buf
}
