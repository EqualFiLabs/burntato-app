# Burntato App

Visual-first mobile interface for Burntato. The current implementation recreates the Grab, Burn, Portal, Rewards, and Leaderboard mockups. Game values, standings, swap quotes, and bridge routes remain sample data.

The Privy, Wagmi, Viem, and TanStack Query provider architecture is now installed. Real Privy sign-in and wallet selection are wired into the header and the Portal wallet selector, with a read-only Ethereum mainnet ETH balance for the active wallet. When Privy environment variables are absent the app renders normally in a signed-out shape without a fake address.

The deployed app must use the same Privy App ID as the other applications. Only public identifiers belong in frontend environment configuration: copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_PRIVY_APP_ID` (plus `NEXT_PUBLIC_PRIVY_CLIENT_ID` when the Privy application requires one). Never commit actual values, client secrets, delegated signer IDs, or authorization keys.

Swap, bridge, and game transactions remain unimplemented. The Portal still shows visual-only quotes and routes; no Uniswap, Jupiter, Across, RPC quote services, or contract calls are connected.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the navigation to move between screens. Sign-in controls stay inactive until the Privy environment variables are configured.
