import { slh_dsa_shake_128s } from '@noble/post-quantum/slh-dsa.js'
import type { RecordEnvelope, TransferEnvelope } from './rpc.js'
import { to0x } from './hex.js'
import { encodeTransactionPayload, encodeTransferPayload } from './payload.js'
import type { SignerConfig } from './keys.js'
import {
  deriveEvaluationPoints,
  deriveTestnetChannelKey,
  signTransaction,
  testnetAddress,
} from './silmarils.js'

const SESSION_MATERIAL = new TextEncoder().encode('eternax/testnet/session/v1')

function signSilmarils(config: SignerConfig, message: Uint8Array, nonce: bigint): Uint8Array {
  const sphincsPk = config.sphincsKeypair.publicKey
  const evaluationPoints = deriveEvaluationPoints(sphincsPk, nonce)
  const address = testnetAddress(sphincsPk)
  const channelKey = deriveTestnetChannelKey(SESSION_MATERIAL, address)
  return signTransaction(
    message,
    config.silmarilsMasterKey,
    channelKey,
    evaluationPoints,
  ).signature
}

export function signTransferEnvelope(
  config: SignerConfig,
  authNonce: bigint,
  dest: Uint8Array,
  value: bigint,
): TransferEnvelope {
  const message = encodeTransferPayload(authNonce, value, dest)
  const sphincsPk = config.sphincsKeypair.publicKey
  const sphincsSig = slh_dsa_shake_128s.sign(message, config.sphincsKeypair.secretKey)
  const silmarilsSig = signSilmarils(config, message, authNonce)

  return {
    authNonce: Number(authNonce),
    destHex: to0x(dest),
    value: value.toString(),
    sphincsPkHex: to0x(sphincsPk),
    sphincsSignatureHex: to0x(sphincsSig),
    silmarilsSignatureHex: to0x(silmarilsSig),
  }
}

export function signRecordEnvelope(
  config: SignerConfig,
  nonce: bigint,
  amount: bigint,
  recipient: Uint8Array,
): RecordEnvelope {
  const message = encodeTransactionPayload(nonce, amount, recipient)
  const sphincsPk = config.sphincsKeypair.publicKey
  const sphincsSig = slh_dsa_shake_128s.sign(message, config.sphincsKeypair.secretKey)
  const silmarilsSig = signSilmarils(config, message, nonce)

  return {
    payloadHex: to0x(message),
    nonce: Number(nonce),
    sphincsPkHex: to0x(sphincsPk),
    sphincsSignatureHex: to0x(sphincsSig),
    silmarilsSignatureHex: to0x(silmarilsSig),
  }
}
