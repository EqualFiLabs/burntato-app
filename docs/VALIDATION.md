# Robinhood testnet validation ledger

This ledger keeps static, local, fork, live-read, browser, and live-write claims separate.

| Evidence class | Result | Boundary |
| --- | --- | --- |
| Static/unit | `npm run verify` | Tests, lint, TypeScript, Ponder types, and production build; environment-bound suites skip unless configured. |
| Indexer runtime | Ponder uses Statics block `112330669` and Burntato block `113055786`; `/ready`, `/status`, `/events`, and deployment identity require a fresh backfill | The prior local PGlite proof targeted the superseded Burntato instance. Hosted database/RPC and a fresh low-cost deployment backfill remain operational work. |
| Live read-only | `BURNTATO_LIVE_RPC_URL=… npm run test:live` | Confirms chain 46630, bytecode, tuple decode, round/pause state, faucet/Vault/Operator/launch state, pool key, 1% fee, 40/60 split, and a live Quoter response. Sends no transaction. |
| Fork execution | `BURNTATO_FORK_RPC_URL=http://127.0.0.1:8547 npm run test:fork` | On an isolated fork: faucet claim, exact Genesis purchase approval/purchase, activation, Operator registration, 15% purchase revenue claim, V4 buy, and Permit2 V4 sell. No testnet state changed. |
| Browser | Desktop `1440×900` and mobile `390×844` passed without horizontal or document overflow; the Operator rewards route stays inside the same fixed app frame and derives its token dropdown from the connected wallet. The tested wallet correctly rendered an empty owned-Operator state. | Wallet ownership discovery and `ownerOf` filtering are unit-tested; no wallet with a live Operator was available for a populated-dropdown browser check. No Operator write was sent. |
| Live transactions | Not authorized and not executed | Requires separate user authorization. The sole public STATICS faucet bundle remains untouched. |

## Publication prerequisites

- Authorize an absolute production domain before setting canonical metadata or publishing production.
- Deploy the Ponder service with a dedicated authenticated RPC, durable PostgreSQL database, unique schema, monitored `/ready` and `/status`, and an allowed app origin.
- Allowlist the final app origin in Privy and verify the tenant accepts custom EVM chain `46630`; the current local origin returned `Origin not allowed`. The code is EVM-only, but tenant configuration is external.
- Arrange enough Robinhood testnet ETH for gameplay, swaps, and transaction gas.
- Run real transactions only after explicit authorization, then record transaction hashes separately from fork evidence.
