# Burntato App

Visual-first mobile interface for Burntato. The current implementation recreates the Grab, Burn, Portal, Rewards, and Leaderboard mockups. Game values, standings, swap quotes, and bridge routes remain sample data.

The Privy, Wagmi, Viem, and TanStack Query provider architecture is installed. Real Privy sign-in and wallet selection are wired into the header and the Portal wallet selector, with a read-only Ethereum mainnet ETH balance for the active wallet. When wallet environment variables are absent or incomplete the app renders normally in a signed-out shape without a fake address, and the browser console names the missing variables.

The deployed app must use the same Privy App ID as the other applications. Only public identifiers belong in frontend environment configuration: copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_PRIVY_APP_ID` (plus `NEXT_PUBLIC_PRIVY_CLIENT_ID` when the Privy application requires one) and the three public RPC endpoints. Each RPC must be an absolute, credential-free HTTP(S) URL; the configured wallet runtime never falls back to chain-default public RPCs, and an incomplete configuration intentionally leaves sign-in unavailable rather than half-configured. Never commit actual values, client secrets, delegated signer IDs, or authorization keys.

Swap, bridge, and game transactions remain unimplemented. The Portal still shows visual-only quotes and routes; no Uniswap, Jupiter, Across, RPC quote services, or contract calls are connected.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the navigation to move between screens. Sign-in controls stay inactive until the wallet environment variables are configured.
