export interface TransferEnvelope {
  authNonce: number
  destHex: string
  value: string
  sphincsPkHex: string
  sphincsSignatureHex: string
  silmarilsSignatureHex: string
}

export interface RecordEnvelope {
  payloadHex: string
  nonce: number
  sphincsPkHex: string
  sphincsSignatureHex: string
  silmarilsSignatureHex: string
}

export interface SubmitResult {
  txHash: string
  sphincsVerified: boolean
  silmarilsVerified: boolean
  record: Record<string, unknown>
}

export interface TransferResult extends SubmitResult {
  destHex: string
  value: string
}

let rpcId = 0

export async function rpcCall<T>(url: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params: [params] }),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`)
  }
  const json = (await res.json()) as { error?: { message?: string }; result?: T }
  if (json.error) {
    throw new Error(json.error.message ?? JSON.stringify(json.error))
  }
  return json.result as T
}

export async function verifyTransfer(url: string, envelope: TransferEnvelope): Promise<TransferResult> {
  return rpcCall(url, 'eternax_verifyTestnetTransfer', envelope)
}

export async function submitTransfer(url: string, envelope: TransferEnvelope): Promise<TransferResult> {
  return rpcCall(url, 'eternax_submitTestnetTransfer', envelope)
}

export async function verifyRecord(url: string, envelope: RecordEnvelope): Promise<SubmitResult> {
  return rpcCall(url, 'eternax_verifyTestnetTx', envelope)
}

export async function submitRecord(url: string, envelope: RecordEnvelope): Promise<SubmitResult> {
  return rpcCall(url, 'eternax_submitTestnetTx', envelope)
}

export async function getTestnetBlock(url: string, block: string | number = 'latest'): Promise<unknown[]> {
  return rpcCall(url, 'eternax_getTestnetBlock', block)
}
