import { slh_dsa_shake_128s } from '@noble/post-quantum/slh-dsa.js'
import { fromHex } from './hex.js'
import { deriveMasterKey } from './silmarils.js'

export interface KeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface SignerConfig {
  sphincsKeypair: KeyPair
  silmarilsMasterKey: Uint8Array
}

const DEFAULT_SILMARILS_MASTER_SEED = 'eternax-testnet-wallet-seed-v1'

export function loadSignerConfig(): SignerConfig {
  const skEnv = process.env.DEMO_SPHINCS_SK_HEX
  const pkEnv = process.env.DEMO_SPHINCS_PK_HEX

  let sphincsKeypair: KeyPair
  if (skEnv && pkEnv) {
    const secretKey = fromHex(skEnv)
    const publicKey = fromHex(pkEnv)
    if (secretKey.length !== 64) {
      throw new Error(`DEMO_SPHINCS_SK_HEX must be 64 bytes (got ${secretKey.length})`)
    }
    if (publicKey.length !== 32) {
      throw new Error(`DEMO_SPHINCS_PK_HEX must be 32 bytes (got ${publicKey.length})`)
    }
    const derivedPk = slh_dsa_shake_128s.getPublicKey(secretKey)
    if (toHex(derivedPk) !== toHex(publicKey)) {
      throw new Error('DEMO_SPHINCS_PK_HEX does not match DEMO_SPHINCS_SK_HEX')
    }
    sphincsKeypair = { publicKey, secretKey }
  } else if (skEnv && !pkEnv) {
    const secretKey = fromHex(skEnv)
    if (secretKey.length !== 64) {
      throw new Error(`DEMO_SPHINCS_SK_HEX must be 64 bytes (got ${secretKey.length})`)
    }
    sphincsKeypair = {
      secretKey,
      publicKey: slh_dsa_shake_128s.getPublicKey(secretKey),
    }
    console.warn(
      `Generated run uses SPHINCS+ pk ${to0x(sphincsKeypair.publicKey)} — set DEMO_SPHINCS_PK_HEX for reproducible runs`,
    )
  } else {
    const keygen = slh_dsa_shake_128s.keygen()
    sphincsKeypair = { secretKey: keygen.secretKey, publicKey: keygen.publicKey }
    console.warn(
      'No DEMO_SPHINCS_SK_HEX set; generated ephemeral SPHINCS+ keypair for this run only.',
    )
    console.warn(`  DEMO_SPHINCS_SK_HEX=${to0x(sphincsKeypair.secretKey)}`)
    console.warn(`  DEMO_SPHINCS_PK_HEX=${to0x(sphincsKeypair.publicKey)}`)
  }

  const silmarilsMasterKey = resolveSilmarilsMasterKey(sphincsKeypair.secretKey)
  return { sphincsKeypair, silmarilsMasterKey }
}

function resolveSilmarilsMasterKey(sphincsSecretKey: Uint8Array): Uint8Array {
  if (process.env.DEMO_SILMARILS_MASTER_FROM_SPHINCS === '1') {
    return deriveMasterKey(sphincsSecretKey)
  }
  const seedText = process.env.DEMO_SILMARILS_MASTER_SEED ?? DEFAULT_SILMARILS_MASTER_SEED
  return deriveMasterKey(new TextEncoder().encode(seedText))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function to0x(bytes: Uint8Array): string {
  return `0x${toHex(bytes)}`
}
