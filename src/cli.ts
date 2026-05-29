#!/usr/bin/env node
import { fromHex } from './hex.js'
import { loadSignerConfig } from './keys.js'
import {
  getTestnetBlock,
  submitRecord,
  submitTransfer,
  verifyRecord,
  verifyTransfer,
} from './rpc.js'
import { signRecordEnvelope, signTransferEnvelope } from './signer.js'

const node0 = process.env.ETERNAX_NODE0_URL ?? 'https://pluto-testnet.eternax.ai/rpc0'
const node1 = process.env.ETERNAX_NODE1_URL ?? 'https://pluto-testnet.eternax.ai/rpc1'
const mode = process.env.DEMO_MODE ?? 'record'
const shouldSubmit = process.env.DEMO_SUBMIT !== '0'

async function main(): Promise<void> {
  const config = loadSignerConfig()

  if (mode === 'transfer') {
    await runTransfer(config)
    return
  }
  if (mode !== 'record') {
    throw new Error(`Unknown DEMO_MODE=${mode} (use record or transfer)`)
  }
  await runRecord(config)
}

async function runTransfer(config: ReturnType<typeof loadSignerConfig>): Promise<void> {
  const authNonce = BigInt(
    process.env.DEMO_AUTH_NONCE ?? process.env.DEMO_NONCE ?? '1',
  )
  const destHex =
    process.env.DEMO_DEST_HEX ?? '0x3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0'
  const value = BigInt(process.env.DEMO_VALUE ?? '1000000000000000000')

  const dest = fromHex(destHex)
  if (dest.length !== 20) {
    throw new Error('DEMO_DEST_HEX must decode to 20 bytes')
  }

  const envelope = signTransferEnvelope(config, authNonce, dest, value)

  for (const [label, url] of [
    ['node0', node0],
    ['node1', node1],
  ] as const) {
    const verified = await verifyTransfer(url, envelope)
    console.log(
      `${label} verify: sphincs=${verified.sphincsVerified} silmarils=${verified.silmarilsVerified} tx_hash=${verified.txHash} dest=${verified.destHex} value=${verified.value}`,
    )
    if (!verified.sphincsVerified || !verified.silmarilsVerified) {
      throw new Error(`${label} verification failed`)
    }
  }

  if (!shouldSubmit) {
    console.log('DEMO_SUBMIT=0 — verify-only, skipping submit')
    return
  }

  const submitted = await submitTransfer(node0, envelope)
  console.log(
    `submitted transfer on node0: tx_hash=${submitted.txHash} dest=${submitted.destHex} value=${submitted.value}`,
  )

  await sleep(8000)
  const records = await getTestnetBlock(node0, 'latest')
  if (!records.length) {
    throw new Error('expected testnet records in the latest block after transfer')
  }
  console.log('verified transfer demo succeeded')
}

async function runRecord(config: ReturnType<typeof loadSignerConfig>): Promise<void> {
  const nonce = BigInt(process.env.DEMO_NONCE ?? '1')
  const amount = BigInt(process.env.DEMO_AMOUNT ?? '1000')
  const recipientHex = process.env.DEMO_RECIPIENT_HEX ?? `0x${'42'.repeat(32)}`
  const recipient = fromHex(recipientHex)
  if (recipient.length !== 32) {
    throw new Error('DEMO_RECIPIENT_HEX must decode to 32 bytes')
  }

  const envelope = signRecordEnvelope(config, nonce, amount, recipient)

  for (const [label, url] of [
    ['node0', node0],
    ['node1', node1],
  ] as const) {
    const verified = await verifyRecord(url, envelope)
    console.log(
      `${label} verify: sphincs=${verified.sphincsVerified} silmarils=${verified.silmarilsVerified} tx_hash=${verified.txHash}`,
    )
    if (!verified.sphincsVerified || !verified.silmarilsVerified) {
      throw new Error(`${label} verification failed`)
    }
  }

  if (!shouldSubmit) {
    console.log('DEMO_SUBMIT=0 — verify-only, skipping submit')
    return
  }

  const submitted = await submitRecord(node0, envelope)
  console.log(`submitted on node0: tx_hash=${submitted.txHash}`)

  await sleep(8000)
  const records = await getTestnetBlock(node0, 'latest')
  if (!records.length) {
    throw new Error('expected testnet records in the latest block view')
  }
  console.log('record demo succeeded')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
