# Burntato App

Consumer interface for Burntato across mobile and desktop. Play, Burn, Rewards, and Leaderboard are connected to the disposable Ethereum Sepolia deployment at `0xdaD8812ac9F829c09808cBaB98b316042D9C7142` (deployment block `11518114`, source commit `5d5dd21`). The Portal remains a visual-only preview.

Wagmi and Viem read the Sepolia game every three seconds, anchor the countdown to the latest block timestamp, simulate writes before opening the wallet, and wait for transaction receipts before refreshing state. Privy supplies shared app identity and wallet selection when configured, while signed-out spectators can still see the live game, leaderboard, and history. The active-wallet header shows Sepolia ETH. Leaderboard and reward discovery scan Diamond events from the deployment block in bounded chunks and cache the incremental result through TanStack Query. This direct-RPC history path is intentionally suitable only for the throwaway deployment; a production deployment should use a durable event indexer.

Copy `.env.example` to `.env.local` and set the credential-free `NEXT_PUBLIC_SEPOLIA_RPC_URL`; this is the only RPC the app requires. To enable sign-in and transactions, also set the shared `NEXT_PUBLIC_PRIVY_APP_ID` and, when required by the Privy application, `NEXT_PUBLIC_PRIVY_CLIENT_ID`. Missing Privy configuration leaves the public Sepolia game, leaderboard, and history available in spectator mode. Never commit actual values, client secrets, delegated signer IDs, or authorization keys.

Play can start/grab or settle a round. Once holder emission has matured, the holder can collect it and any connected account can permissionlessly finalize it for the recorded holder. Burn commits the active wallet's POTATO directly to the next recovery round. Rewards validates winner and recovery eligibility against contract state and claims one round at a time to the active wallet. The Portal still shows visual-only quotes and routes; no Uniswap, Jupiter, Across, or quote services are connected, and no additional chain runtime is configured for the preview.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the navigation to move between screens. With only the Sepolia RPC configured, live public data works while wallet controls remain inactive. This deployment uses test ETH and test POTATO, so the UI intentionally does not show fiat values for game assets.
