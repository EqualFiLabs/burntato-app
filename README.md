# Burntato App

Consumer interface for Burntato across mobile and desktop. Play, Burn, Rewards, and Leaderboard are connected to the Robinhood Chain Testnet deployment at `0x1FA9a3c895e802670b35a9d577D42d4dE20e4818` (deployment block `112339401`, source commit `07688de3193492aca399c8bbadc9321162e5f726`).

Wagmi and Viem read the Robinhood testnet game every three seconds, anchor the countdown to the latest block timestamp, simulate writes before opening the wallet, and wait for transaction receipts before refreshing state. Privy supplies shared app identity and wallet selection when configured, while signed-out spectators can still see the live game, leaderboard, and history. The active-wallet header shows testnet ETH.

Copy `.env.example` to `.env.local` and set the credential-free `NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL`. To enable sign-in and transactions, also set the shared `NEXT_PUBLIC_PRIVY_APP_ID` and, when required by the Privy application, `NEXT_PUBLIC_PRIVY_CLIENT_ID`. Missing Privy configuration leaves the public game available in spectator mode. Never commit actual values, client secrets, delegated signer IDs, or authorization keys.

Play can start/grab or settle a round. Once holder emission has matured, the holder can collect it and any connected account can permissionlessly finalize it for the recorded holder. Burn commits the active wallet's POTATO directly to the next recovery round. Rewards validates winner and recovery eligibility against contract state and claims one round at a time to the active wallet. The Portal quotes live ETH/POTATO exact-input swaps through the deployed V4 Quoter and executes through Universal Router; POTATO sells use an exact Permit2 authorization. Cross-chain routes are explicitly unavailable.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the navigation to move between screens. With only the Robinhood testnet RPC configured, live public data works while wallet controls remain inactive. This deployment uses test ETH and test POTATO, so the UI intentionally does not show fiat values for game assets.
