# pluto-testnet-tools

TypeScript CLI for the [Pluto testnet](https://pluto-testnet.eternax.ai): dual-sign with SPHINCS+ and SILMARILS, then call `eternax_*` JSON-RPC on the public nodes. No Rust toolchain or `eternax-core` checkout required.

This mirrors `scripts/testnet-submit.sh` / `silmarils-testnet-cli` (`dual_sign_testnet`) from the private node repo.

## Quick start

```bash
git clone https://github.com/eternax-ai/pluto-testnet-tools.git
cd pluto-testnet-tools
npm install
cp .env.example .env   # optional

# Legacy record path (default)
npm run submit

# Verified balance transfer from the demo pot
npm run submit:transfer

# Verify on node0 + node1 without submitting
DEMO_SUBMIT=0 npm run submit:transfer
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
| `ETERNAX_NODE1_URL` | Pluto `/rpc1` | Second node (verify quorum) |
| `DEMO_MODE` | `record` | `record` or `transfer` |
| `DEMO_SUBMIT` | `1` | Set `0` for verify-only |
| `DEMO_AUTH_NONCE` | `1` | Transfer auth nonce |
| `DEMO_DEST_HEX` | Baltathar | 20-byte destination |
| `DEMO_VALUE` | `1000000000000000000` | Raw units (1 ETX @ 18 decimals) |
| `DEMO_NONCE` | `1` | Record-mode nonce |
| `DEMO_AMOUNT` | `1000` | Record-mode amount |
| `DEMO_RECIPIENT_HEX` | `0x42…` (32 bytes) | Record-mode recipient |
| `DEMO_SPHINCS_SK_HEX` | — | Optional fixed SPHINCS+ secret (64 bytes) |
| `DEMO_SPHINCS_PK_HEX` | — | Optional matching public key (32 bytes) |
| `DEMO_SILMARILS_MASTER_SEED` | `eternax-testnet-wallet-seed-v1` | SILMARILS HKDF seed (CLI default) |
| `DEMO_SILMARILS_MASTER_FROM_SPHINCS` | `0` | Set `1` to match [demo-web](https://github.com/eternax-ai/eternax-core) wallet keys |

## Web wallet demo keys

For browser signing, use the prefunded demo SPHINCS+ keys from `eternax-core` README and set:

```bash
export DEMO_SILMARILS_MASTER_FROM_SPHINCS=1
export DEMO_SPHINCS_SK_HEX=0xece714856a1061c7b3d0da60bac2acf3ea2c5604b6863fa82bc58bd6ab91f6469c6f89df16e669a903de39d89787f42abca9cb41e4fbe70d4e388b5edc444d68
export DEMO_SPHINCS_PK_HEX=<derive or paste matching pk>
DEMO_MODE=transfer DEMO_SUBMIT=0 npm run submit:transfer
```

## Modes

| `DEMO_MODE` | Description |
|-------------|-------------|
| `transfer` | Verified pot transfer (recommended; matches the web wallet) |
| `record` | Legacy SILMARILS record admission |

Both modes use FIPS 205 SLH-DSA-SHAKE-128s signatures from `@noble/post-quantum`. Pluto nodes must run a build where `eternax_verifyTestnetTx` uses the same verifier as transfer (see eternax-core `node/src/rpc/testnet.rs`).

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
| `src/cli.ts` | `testnet-submit.sh` equivalent |

## Build / publish

```bash
npm run build
npx pluto-testnet   # after npm link or global install
```

## Related repos

- [eternax-core](https://github.com/eternax-ai/eternax-core) — node, runtime, Rust CLI
- [agent-contracts](https://github.com/eternax-ai/agent-contracts) — EVM/Hardhat (different stack; not used here)

## License

Unlicense (public domain).
