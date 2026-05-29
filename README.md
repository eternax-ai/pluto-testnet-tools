# pluto-testnet-tools

TypeScript CLI for the [Pluto testnet](https://pluto-testnet.eternax.ai): dual-sign with SPHINCS+ and SILMARILS, then call `eternax_*` JSON-RPC on the public nodes.

Signing matches the [eternax-core web wallet](https://github.com/eternax-ai/eternax-core): paste a **SPHINCS+ secret key**; SILMARILS master material is derived from that key (not a separate fixed seed). Each run uses fresh **auth nonce** unless you set `PLUTO_AUTH_NONCE` — that value is only for evaluation points / the signed payload, not the Substrate account transaction nonce.

## Quick start

```bash
git clone https://github.com/eternax-ai/pluto-testnet-tools.git
cd pluto-testnet-tools
npm install
cp .env.example .env
# edit PLUTO_SPHINCS_SK_HEX if needed

# Verified balance transfer from the prefunded pot
npm run submit:transfer

# Verify on nodes without submitting
PLUTO_SUBMIT=0 npm run submit:transfer

# Legacy record path
npm run submit:record
```

## Public endpoints

| Service | URL |
|---------|-----|
| Web wallet | https://pluto-testnet.eternax.ai/web-wallet/ |
| RPC node0 | https://pluto-testnet.eternax.ai/rpc0 |
| RPC node1 | https://pluto-testnet.eternax.ai/rpc1 |
| WebSocket | `wss://pluto-testnet.eternax.ai/ws0` |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ETERNAX_NODE0_URL` | Pluto `/rpc0` | Primary RPC |
| `ETERNAX_NODE1_URL` | Pluto `/rpc1` | Backup RPC |
| `PLUTO_MODE` | `record` | `record` or `transfer` |
| `PLUTO_SUBMIT` | `1` | Set `0` for verify-only |
| `PLUTO_AUTH_NONCE` | `Date.now()` | SILMARILS transfer auth nonce (not FRAME account nonce) |
| `PLUTO_DEST_HEX` | Baltathar | 20-byte destination |
| `PLUTO_VALUE` | `1000000000000000000` | Raw units (1 ETX @ 18 decimals) |
| `PLUTO_NONCE` | `Date.now()` | Record-mode payload nonce |
| `PLUTO_AMOUNT` | `1000` | Record-mode amount |
| `PLUTO_RECIPIENT_HEX` | `0x42…` (32 bytes) | Record-mode recipient |
| `PLUTO_SPHINCS_SK_HEX` | **required** | 64-byte SPHINCS+ secret (hex) |
| `PLUTO_SPHINCS_PK_HEX` | derived from SK | Optional; checked if set |
| `PLUTO_SILMARILS_MASTER_SEED` | — | Optional; dev fixed seed |

## Prefunded account keys

Same keys as `eternax-core` README / web wallet:

| Label | Secret key (hex) |
|-------|------------------|
| Account 1 | `0xece714856a1061c7b3d0da60bac2acf3ea2c5604b6863fa82bc58bd6ab91f6469c6f89df16e669a903de39d89787f42abca9cb41e4fbe70d4e388b5edc444d68` |
| Account 2 | `0x3b0b14d070c7ef7d0a7c30a64d0a6e616f2022d474cc340198e331f6fabb91d9378d19651a99f863a2d1e039ec478547dbc87b5664249897015295a8c2434675` |
| Account 3 | `0x84ef911c386be817d9d4a8c5902116ec1af2d51c2c3336659c9fb316f4844b1359647532b9eab38018e70c79d12576ce13db964f9a49d952ecf59597d2098009` |

```bash
export PLUTO_SPHINCS_SK_HEX=0xece714856a1061c7b3d0da60bac2acf3ea2c5604b6863fa82bc58bd6ab91f6469c6f89df16e669a903de39d89787f42abca9cb41e4fbe70d4e388b5edc444d68
PLUTO_MODE=transfer PLUTO_SUBMIT=0 npm run submit:transfer
```

## Modes

| `PLUTO_MODE` | Description |
|-------------|-------------|
| `transfer` | Verified pot transfer (recommended; matches the web wallet) |
| `record` | Legacy SILMARILS record admission |

Both modes use FIPS 205 SLH-DSA-SHAKE-128s signatures from `@noble/post-quantum`. 

## RPC methods used

| Mode | Verify | Submit |
|------|--------|--------|
| `record` | `eternax_verifyTestnetTx` | `eternax_submitTestnetTx` |
| `transfer` | `eternax_verifyTestnetTransfer` | `eternax_submitTestnetTransfer` |

Both modes also call `eternax_getTestnetBlock` after submit.

## Library layout

| File | Role |
|------|------|
| `src/silmarils.ts` | SILMARILS sign/derive (port of `crates/silmarils`) |
| `src/signer.ts` | Build RPC envelopes |
| `src/rpc.ts` | JSON-RPC client |
| `src/keys.ts` | Load SPHINCS+ SK; derive SILMARILS master (web wallet) |
| `src/cli.ts` | Submit/verify driver |

## Build / publish

```bash
npm run build
npx pluto-testnet   # after npm link or global install
```

## License

Unlicense (public domain).
