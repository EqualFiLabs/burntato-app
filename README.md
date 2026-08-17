# Burntato App

Visual-first mobile interface for Burntato. The current implementation recreates the Grab and Burn mockups with static sample data and local interactions only. Wallet, RPC, and contract integration are intentionally not connected yet.

The connected phase will add the Privy, Wagmi, Viem, and TanStack Query provider architecture from the neighboring Statics app. Those packages are deliberately not installed while this application remains visual-only.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and use the Home and Burn tabs to switch between the two reference screens.
