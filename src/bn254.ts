/**
 * BN254 scalar field (Fr) arithmetic using native BigInt.
 */

export const FR_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

export function frMod(a: bigint): bigint {
  const r = a % FR_ORDER
  return r < 0n ? r + FR_ORDER : r
}

export function frAdd(a: bigint, b: bigint): bigint {
  return frMod(a + b)
}

export function frSub(a: bigint, b: bigint): bigint {
  return frMod(a - b)
}

export function frMul(a: bigint, b: bigint): bigint {
  return frMod(a * b)
}

export function frInv(a: bigint): bigint {
  if (a === 0n) throw new Error('cannot invert zero')
  return frPow(a, FR_ORDER - 2n)
}

export function frDiv(a: bigint, b: bigint): bigint {
  return frMul(a, frInv(b))
}

function frPow(base: bigint, exp: bigint): bigint {
  let result = 1n
  base = frMod(base)
  while (exp > 0n) {
    if (exp & 1n) result = frMul(result, base)
    exp >>= 1n
    base = frMul(base, base)
  }
  return result
}

export function frFromBytes(bytes: Uint8Array): bigint {
  let val = 0n
  for (const b of bytes) {
    val = (val << 8n) | BigInt(b)
  }
  return frMod(val)
}

export function frToBytes(val: bigint): Uint8Array {
  val = frMod(val)
  const out = new Uint8Array(32)
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(val & 0xffn)
    val >>= 8n
  }
  return out
}

export function frRand(rng: () => Uint8Array): bigint {
  let val: bigint
  do {
    val = frFromBytes(rng())
  } while (val === 0n)
  return val
}
