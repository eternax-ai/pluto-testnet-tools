import { slh_dsa_shake_128s } from '@noble/post-quantum/slh-dsa.js'
import { fromHex, to0x } from './hex.js'
import { deriveMasterKey } from './silmarils.js'

export interface KeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface SignerConfig {
  sphincsKeypair: KeyPair
  silmarilsMasterKey: Uint8Array
}

/**
 * Load keys like apps/demo-web: SPHINCS+ secret from env, SILMARILS master = HKDF(secret).
 * Set PLUTO_SILMARILS_MASTER_SEED only to match the Rust testnet CLI fixed seed.
 */
export function loadSignerConfig(): SignerConfig {
  const skEnv = process.env.PLUTO_SPHINCS_SK_HEX?.trim()
  if (!skEnv) {
    throw new Error(
      'PLUTO_SPHINCS_SK_HEX is required (64-byte SPHINCS+ secret, hex). ' +
        'Use the same prefunded keys as the web wallet — see README.',
    )
  }

  const secretKey = fromHex(skEnv)
  if (secretKey.length !== 64) {
    throw new Error(`PLUTO_SPHINCS_SK_HEX must be 64 bytes (got ${secretKey.length})`)
  }

  const pkEnv = process.env.PLUTO_SPHINCS_PK_HEX?.trim()
  const publicKey = pkEnv ? fromHex(pkEnv) : slh_dsa_shake_128s.getPublicKey(secretKey)

  if (pkEnv) {
    if (publicKey.length !== 32) {
      throw new Error(`PLUTO_SPHINCS_PK_HEX must be 32 bytes (got ${publicKey.length})`)
    }
    const derivedPk = slh_dsa_shake_128s.getPublicKey(secretKey)
    if (to0x(derivedPk) !== to0x(publicKey)) {
      throw new Error('PLUTO_SPHINCS_PK_HEX does not match PLUTO_SPHINCS_SK_HEX')
    }
  }

  const sphincsKeypair = { publicKey, secretKey }
  const silmarilsMasterKey = resolveSilmarilsMasterKey(secretKey)
  return { sphincsKeypair, silmarilsMasterKey }
}

function resolveSilmarilsMasterKey(sphincsSecretKey: Uint8Array): Uint8Array {
  const rustCliSeed = process.env.PLUTO_SILMARILS_MASTER_SEED?.trim()
  if (rustCliSeed) {
    return deriveMasterKey(new TextEncoder().encode(rustCliSeed))
  }
  return deriveMasterKey(sphincsSecretKey)
}
