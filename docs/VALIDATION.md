# Robinhood testnet validation ledger

This ledger keeps static, local, fork, live-read, browser, and live-write claims separate.

| Evidence class | Result | Boundary |
| --- | --- | --- |
| Static/unit | `npm run verify` passed with 70 tests and 3 environment-bound skips | Tests, lint, TypeScript, Ponder types, and production build passed; live/fork lifecycle proof remains separate. |
| Indexer runtime | Frontend and Ponder now consume one validated deployment manifest and compare chain, deployment ID, source commit, and Diamond identity | Hosted database/RPC and a fresh final-deployment backfill remain operational work. |
| Live read-only | Blocked on final deployment | The currently pinned testnet Diamond does not match the current ABI. After deployment, rerun the read-only suite to confirm chain, bytecode, tuple decoding, lifecycle state, supporting contracts, pool identity, fees, and quoting. |
| Fork execution | Blocked on final deployment | The currently pinned testnet Diamond returns the superseded 15-field protocol tuple, so current-source decoding stops before lifecycle writes. Deploy the frozen protocol, update the manifest, then rerun the full isolated-fork flow including pause and stalled Recovery withdrawal. |
| Browser | Desktop `1440×900` and mobile `390×844` passed without horizontal or document overflow; the Operator rewards route stays inside the same fixed app frame and derives its token dropdown from the connected wallet. The tested wallet correctly rendered an empty owned-Operator state. | Wallet ownership discovery and `ownerOf` filtering are unit-tested; no wallet with a live Operator was available for a populated-dropdown browser check. No Operator write was sent. |
| Live transactions | Not authorized and not executed | Requires separate user authorization. The sole public STATICS faucet bundle remains untouched. |

## Publication prerequisites

- Freeze and deploy the final Burntato source, then replace the checked-in manifest with its addresses, blocks, pool identity, and source commit.
- Authorize an absolute production domain before setting canonical metadata or publishing production.
- Deploy the Ponder service with a dedicated authenticated RPC, durable PostgreSQL database, unique schema, monitored `/ready` and `/status`, and an allowed app origin.
- Allowlist the final app origin in Privy and verify the tenant accepts custom EVM chain `46630`; the current local origin returned `Origin not allowed`. The code is EVM-only, but tenant configuration is external.
- Arrange enough Robinhood testnet ETH for gameplay, swaps, and transaction gas.
- Run real transactions only after explicit authorization, then record transaction hashes separately from fork evidence.
