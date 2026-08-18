# Burntato App

Consumer interface for Burntato across mobile and desktop. Play, Burn, Rewards, and Leaderboard are connected to the disposable Ethereum Sepolia deployment at `0xdaD8812ac9F829c09808cBaB98b316042D9C7142` (deployment block `11518114`, source commit `5d5dd21`). The Portal remains a visual-only preview.

Privy supplies shared app identity and wallet selection. Wagmi and Viem read the Sepolia game every three seconds, anchor the countdown to the latest block timestamp, simulate writes before opening the wallet, and wait for transaction receipts before refreshing state. The active-wallet header shows Sepolia ETH. Leaderboard and reward discovery scan Diamond events from the deployment block in bounded chunks and cache the incremental result through TanStack Query. This direct-RPC history path is intentionally suitable only for the throwaway deployment; a production deployment should use a durable event indexer.

The deployed app must use the same Privy App ID as the other applications. Only public identifiers belong in frontend environment configuration: copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_PRIVY_APP_ID` (plus `NEXT_PUBLIC_PRIVY_CLIENT_ID` when the Privy application requires one) and all four public RPC endpoints, including `NEXT_PUBLIC_SEPOLIA_RPC_URL`. Each RPC must be an absolute, credential-free HTTP(S) URL; the configured wallet runtime never falls back to chain-default public RPCs, and an incomplete configuration intentionally leaves sign-in and game access unavailable rather than half-configured. Never commit actual values, client secrets, delegated signer IDs, or authorization keys.

Play can start/grab or settle a round and materialize a mature holder emission. Burn commits the active wallet's POTATO directly to the next recovery round. Rewards validates winner and recovery eligibility against contract state and claims one round at a time to the active wallet. The Portal still shows visual-only quotes and routes; no Uniswap, Jupiter, Across, or quote services are connected.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the navigation to move between screens. Sign-in and game controls stay inactive until the wallet environment variables are configured. This deployment uses test ETH and test POTATO, so the UI intentionally does not show fiat values for game assets.
