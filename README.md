# Burntato App

Burntato is a live consumer application for the deployed Robinhood Chain Testnet game, Operator rewards, and ETH/POTATO V4 market. Every displayed game value, balance, quote, fee, eligibility decision, and reward comes from the configured chain or is labeled unavailable. Testnet assets have no represented USD value.

The application supports public read-only spectator mode. Adding a Privy App ID enables EVM wallet sign-in and transactions; Solana wallet creation and discovery remain disabled. Writes are simulated first, locked through receipt confirmation, and refreshed from current onchain state.

## Local setup

Requirements: Node.js 22+, npm 10+.

```bash
npm ci
npm ci --prefix indexer
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL` must be an absolute credential-free HTTP(S) endpoint. `NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_PRIVY_CLIENT_ID` are optional public identifiers; never put Privy secrets, delegated signer material, authorization keys, private keys, or credential-bearing RPC URLs in frontend variables.

To run the durable history service locally:

```bash
cp indexer/.env.example indexer/.env.local
npm --prefix indexer run dev
```

Set `NEXT_PUBLIC_BURNTATO_INDEXER_URL` to its public origin. Ponder owns `/health`, `/ready`, and `/status`; `/events` supplies deterministic event history, and `/burntato/deployment` reports the source identity. Hosted instances need a dedicated RPC provider, `DATABASE_URL`, and a schema owned only by this deployment. Never reuse a schema belonging to another Ponder app.

## Product paths

- Play starts/grabs or settles a round and permissionlessly materializes matured holder emission.
- Burn commits wallet POTATO to the next recovery round.
- Rewards independently verifies and claims winner/recovery positions by round.
- Leaderboard derives from the durable event index, with a labeled bounded direct-RPC fallback.
- Operators reads the connected wallet's current Statics Operator ownership, lets the user select an owned token from a dropdown, and registers, syncs, or claims Burntato revenue.
- Portal executes live exact-input ETH/POTATO V4 swaps. Buys use V4 swap/settle/take. Sells use POTATO’s required infinite ERC-20 Permit2 approval followed by an exact, short-lived signed Permit2 authorization. Cross-chain routes and ETH/STATICS routing are explicitly unavailable.

Registered Operators receive 15% of direct game purchases and 40% of the pool’s 1% bilateral swap fee. An owner change or activation-weight decrease invalidates the Burntato registration; forfeited rewards redistribute to other valid Operators, or Treasury when no valid registered weight remains. Activation increases remain valid after sync.

Operator acquisition, activation, and STATICS faucet access belong to the Statics application and are intentionally not exposed by Burntato.

## Deployed Robinhood system

Chain ID `46630`; Burntato source commit
`1e3a49389baffd1aaff9c3bafbdf55e68d489200`; Burntato deployment block
`113055786`. Hot Potato purchases start at `0.00001 ETH`, increase by 1%, and
reset from ten minutes down to a one-minute floor.

| Contract | Address |
| --- | --- |
| Burntato Diamond / POTATO | [`0x5e59…F28F`](https://explorer.testnet.chain.robinhood.com/address/0x5e59B7d841199cD4316b0a081d6530fc7Ae4F28F) |
| Operator rewards router | [`0xd4F2…EFF6`](https://explorer.testnet.chain.robinhood.com/address/0xd4F279C7DfA2756aF90933ac4632D61eBA7eEFF6) |
| Burntato hook | [`0xe699…A444`](https://explorer.testnet.chain.robinhood.com/address/0xe699242c924449e2CbD88919ED419Eb82f85A444) |
| Operator NFT | [`0x8BB2…bC71`](https://explorer.testnet.chain.robinhood.com/address/0x8BB2E39abAE7346293Ff084fd4D104b064BEbC71) |
| V4 Quoter | [`0x8Dc1…8F94`](https://explorer.testnet.chain.robinhood.com/address/0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94) |
| Universal Router | [`0x8876…0904`](https://explorer.testnet.chain.robinhood.com/address/0x8876789976dEcBfCbBbe364623C63652db8C0904) |
| Permit2 | [`0x0000…BA3`](https://explorer.testnet.chain.robinhood.com/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) |

## Verification

```bash
npm run verify
BURNTATO_LIVE_RPC_URL=https://rpc.testnet.chain.robinhood.com npm run test:live
# Start an isolated Anvil fork on port 8547 first:
BURNTATO_FORK_RPC_URL=http://127.0.0.1:8547 npm run test:fork
npm audit --omit=dev --audit-level=high
npm --prefix indexer audit --omit=dev --audit-level=high
```

The default suite skips environment-bound live/fork cases. See [`docs/VALIDATION.md`](docs/VALIDATION.md) for proof boundaries and launch prerequisites.
