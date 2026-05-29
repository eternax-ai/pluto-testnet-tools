/**
 * SILMARILS designated-verifier signing for the EternaX testnet flow.
 * Port of crates/silmarils/src/record.rs (sign_transaction).
 */

import { hmac } from '@noble/hashes/hmac.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { frAdd, frDiv, frFromBytes, frMul, frRand, frSub, frToBytes } from './bn254.js'

export interface EvaluationPoints {
  w0: Uint8Array
  w1: Uint8Array
}

export interface SignResult {
  w0: Uint8Array
  w1: Uint8Array
  signature: Uint8Array
  receipt: Uint8Array
  txHash: Uint8Array
}

export function deriveMasterKey(seed: Uint8Array): Uint8Array {
  return hkdf(
    sha256,
    seed,
    new TextEncoder().encode('silmarils-master-key'),
    new TextEncoder().encode('eternax/testnet/v1'),
    32,
  )
}

export function deriveEvaluationPoints(sphincsPk: Uint8Array, nonce: bigint): EvaluationPoints {
  let counter = 0
  while (true) {
    const info = new Uint8Array(20)
    const enc = new TextEncoder()
    info.set(enc.encode('pk-params'), 0)
    const nonceBytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) nonceBytes[i] = Number((nonce >> BigInt((7 - i) * 8)) & 0xffn)
    info.set(nonceBytes, 9)
    info[17] = counter
    info[18] = 0x77
    info[19] = 0x31

    const okm = hkdf(sha256, sphincsPk, new Uint8Array(0), info, 64)
    const w0 = okm.slice(0, 32)
    const w1 = okm.slice(32, 64)

    const w0Fr = frFromBytes(w0)
    const w1Fr = frFromBytes(w1)
    if (w0Fr !== 0n && w1Fr !== 0n && w0Fr !== w1Fr) {
      return { w0, w1 }
    }
    counter = (counter + 1) & 0xff
  }
}

export function deriveTestnetChannelKey(sessionMaterial: Uint8Array, address: Uint8Array): Uint8Array {
  return hkdf(sha256, sessionMaterial, new TextEncoder().encode('eternax/session'), address, 32)
}

export function testnetAddress(sphincsPk: Uint8Array): Uint8Array {
  return sha256(sphincsPk)
}

export function signTransaction(
  message: Uint8Array,
  masterKey: Uint8Array,
  channelKey: Uint8Array,
  evaluationPoints: EvaluationPoints,
): SignResult {
  const txHash = sha256(message)
  const receipt = computeReceipt(message, channelKey)
  const signature = signWithReceipt(txHash, receipt, masterKey, evaluationPoints)
  return {
    w0: evaluationPoints.w0,
    w1: evaluationPoints.w1,
    signature,
    receipt,
    txHash,
  }
}

function computeReceipt(message: Uint8Array, channelKey: Uint8Array): Uint8Array {
  const nonce = computeChannelNonce(message, channelKey)
  const h = sha256(concat(message, frToBytes(nonce)))
  const out = new Uint8Array(32)
  out.set(h.slice(0, 32))
  return out
}

function computeChannelNonce(message: Uint8Array, channelKey: Uint8Array): bigint {
  const mac = hmac(sha256, channelKey, concat(new TextEncoder().encode('silmarils-nonce'), message))
  return frFromBytes(mac)
}

function signWithReceipt(
  txHash: Uint8Array,
  receipt: Uint8Array,
  masterKey: Uint8Array,
  evaluationPoints: EvaluationPoints,
): Uint8Array {
  const receiptFr = frFromBytes(receipt)
  const w0 = frFromBytes(evaluationPoints.w0)
  const w1 = frFromBytes(evaluationPoints.w1)
  const pmk = derivePerMessageKey(masterKey, txHash)

  const rng = signingRng(masterKey, txHash, receipt, evaluationPoints)
  const keyShares = splitAtPoints(pmk, w0, w1, rng)

  let epsilon: bigint
  while (true) {
    const alpha = frRand(rng)
    const beta = frRand(rng)
    epsilon = frMul(alpha, beta)
    if (epsilon !== 0n) break
  }
  const epsilonShares = splitAtPoints(epsilon, w0, w1, rng)

  let d: bigint
  do {
    d = frRand(rng)
  } while (d === 0n)

  const sigma1 = frMul(d, frSub(pmk, receiptFr))
  const sigma2 = frMul(keyShares[1], d)
  const sigma3 = frDiv(frMul(epsilonShares[1], d), epsilon)
  const sigma4 = frMul(d, frSub(keyShares[0], frDiv(frMul(epsilonShares[0], receiptFr), epsilon)))

  const sig = new Uint8Array(128)
  sig.set(frToBytes(sigma1), 0)
  sig.set(frToBytes(sigma2), 32)
  sig.set(frToBytes(sigma3), 64)
  sig.set(frToBytes(sigma4), 96)
  return sig
}

function derivePerMessageKey(masterKey: Uint8Array, txHash: Uint8Array): bigint {
  const mac = hmac(sha256, masterKey, concat(new TextEncoder().encode('silmarils-pmk'), txHash))
  return frFromBytes(mac)
}

function splitAtPoints(secret: bigint, w0: bigint, w1: bigint, rng: () => Uint8Array): [bigint, bigint] {
  const slope = frRand(rng)
  return [frAdd(secret, frMul(slope, w0)), frAdd(secret, frMul(slope, w1))]
}

function signingRng(
  masterKey: Uint8Array,
  txHash: Uint8Array,
  receipt: Uint8Array,
  evaluationPoints: EvaluationPoints,
): () => Uint8Array {
  const seed = sha256(
    concat(
      new TextEncoder().encode('silmarils-signing-rng'),
      masterKey,
      txHash,
      receipt,
      evaluationPoints.w0,
      evaluationPoints.w1,
    ),
  )

  let counter = 0
  return (): Uint8Array => {
    const counterBytes = new Uint8Array(4)
    counterBytes[0] = counter & 0xff
    counterBytes[1] = (counter >> 8) & 0xff
    counterBytes[2] = (counter >> 16) & 0xff
    counterBytes[3] = (counter >> 24) & 0xff
    counter++
    return sha256(concat(seed, counterBytes))
  }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}
