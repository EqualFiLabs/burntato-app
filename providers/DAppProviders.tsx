"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getEmbeddedConnectedWallet,
  PrivyProvider,
  useConnectWallet,
  usePrivy,
  useWallets,
  type ConnectedWallet,
} from "@privy-io/react-auth";
import {
  defaultSolanaRpcsPlugin,
  toSolanaWalletConnectors,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { createConfig, useSetActiveWallet, WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { arbitrum, base, mainnet } from "viem/chains";
import { useAccount } from "wagmi";

import {
  defaultWalletState,
  WalletContext,
  type EvmWalletSummary,
  type SolanaWalletSummary,
  type WalletKind,
  type WalletState,
  type WalletStatus,
} from "./wallet-context";

type PrivyEnvironment = {
  configured: boolean;
  appId: string;
  clientId: string | undefined;
};

function readPrivyEnvironment(source: Record<string, string | undefined> = process.env): PrivyEnvironment {
  const appId = source.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
  const clientId = source.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() ?? "";
  return { configured: appId.length > 0, appId, clientId: clientId.length > 0 ? clientId : undefined };
}

const privyEnvironment = readPrivyEnvironment();

// Ethereum mainnet is the home chain; Base and Arbitrum are available because
// the Portal will eventually bridge there.
const supportedChains = [mainnet, base, arbitrum] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
});

const WALLET_CLIENT_LABELS: Record<string, string> = {
  privy: "Privy wallet",
  "privy-v2": "Privy wallet",
  metamask: "MetaMask",
  coinbase_wallet: "Coinbase Wallet",
  wallet_connect: "WalletConnect",
  walletconnect: "WalletConnect",
  rainbow: "Rainbow",
  brave: "Brave Wallet",
  frame: "Frame",
  phantom: "Phantom",
  solflare: "Solflare",
  backpack: "Backpack",
};

/**
 * Single authoritative active-wallet resolution. The wallet wagmi reports as
 * active wins when it is still connected; otherwise the embedded wallet, then
 * any remaining wallet. Header and Portal both consume this through the wallet
 * context so they can never disagree.
 */
function resolveActiveWallet(
  wallets: readonly ConnectedWallet[],
  wagmiAddress: string | undefined
): ConnectedWallet | undefined {
  const fromWagmi = wagmiAddress
    ? wallets.find((wallet) => sameAddress(wallet.address, wagmiAddress))
    : undefined;
  return fromWagmi ?? getEmbeddedConnectedWallet([...wallets]) ?? wallets[0];
}

function walletClientLabel(clientType: string | undefined): string {
  if (!clientType) return "External wallet";
  const known = WALLET_CLIENT_LABELS[clientType.toLowerCase()];
  if (known) return known;
  const titleCased = clientType
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  return `${titleCased} wallet`;
}

function walletKindOf(clientType: string | undefined): WalletKind {
  const normalized = clientType?.toLowerCase() ?? "";
  return normalized === "privy" || normalized === "privy-v2" ? "embedded" : "external";
}

function sameAddress(left: string | undefined, right: string | undefined): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { address: wagmiAddress } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const [requestedExternalAddress, setRequestedExternalAddress] = useState<string | null>(null);
  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      if (wallet.type === "ethereum") setRequestedExternalAddress(wallet.address);
    },
  });

  useEffect(() => {
    if (!requestedExternalAddress) return;
    const wallet = wallets.find((candidate) => sameAddress(candidate.address, requestedExternalAddress));
    if (!wallet) return;
    let cancelled = false;
    void setActiveWallet(wallet).finally(() => {
      if (!cancelled) setRequestedExternalAddress(null);
    });
    return () => {
      cancelled = true;
    };
  }, [requestedExternalAddress, setActiveWallet, wallets]);

  const activeWallet = resolveActiveWallet(wallets, wagmiAddress);

  let status: WalletStatus = "loading";
  if (ready && !authenticated) status = "signed-out";
  else if (ready && authenticated && walletsReady && activeWallet) status = "ready";

  const value = useMemo<WalletState>(() => {
    const evmWallets: EvmWalletSummary[] = wallets.map((wallet) => ({
      address: wallet.address,
      kind: walletKindOf(wallet.walletClientType),
      label: walletClientLabel(wallet.walletClientType),
    }));
    const solanaSummaries: SolanaWalletSummary[] = solanaWallets.map((wallet) => ({
      address: wallet.address,
      label: wallet.standardWallet.name,
    }));
    const activeAddress = activeWallet?.address ?? null;
    return {
      configured: true,
      status,
      authenticated,
      evmWallets,
      solanaWallets: solanaSummaries,
      activeAddress,
      activeWalletKind: activeWallet ? walletKindOf(activeWallet.walletClientType) : null,
      activeWalletLabel: activeWallet ? walletClientLabel(activeWallet.walletClientType) : null,
      login: () => login(),
      logout: () => void logout(),
      connectExternalWallet: () => void connectWallet(),
      selectEvmWallet: (address: string) => {
        const wallet = wallets.find((candidate) => sameAddress(candidate.address, address));
        if (wallet) void setActiveWallet(wallet).catch(() => undefined);
      },
      copyActiveAddress: async () => {
        if (!activeAddress) return false;
        try {
          await navigator.clipboard.writeText(activeAddress);
          return true;
        } catch {
          return false;
        }
      },
    };
  }, [
    activeWallet,
    authenticated,
    connectWallet,
    login,
    logout,
    setActiveWallet,
    solanaWallets,
    status,
    wallets,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function ConfiguredWalletProviders({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={privyEnvironment.appId}
      clientId={privyEnvironment.clientId}
      config={{
        loginMethods: ["wallet", "email"],
        supportedChains: [...supportedChains],
        defaultChain: mainnet,
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          solana: { createOnLogin: "off" },
          showWalletUIs: true,
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        appearance: {
          theme: "dark",
          accentColor: "#ff961c",
          walletChainType: "ethereum-and-solana",
        },
        plugins: [defaultSolanaRpcsPlugin()],
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <WalletBridge>{children}</WalletBridge>
      </WagmiProvider>
    </PrivyProvider>
  );
}

function UnconfiguredWalletProviders({ children }: { children: ReactNode }) {
  // The module-level defaultWalletState keeps a stable identity, so the app
  // renders normally in a signed-out shape without Privy environment values.
  return <WalletContext.Provider value={defaultWalletState}>{children}</WalletContext.Provider>;
}

export function DAppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {privyEnvironment.configured ? (
        <ConfiguredWalletProviders>{children}</ConfiguredWalletProviders>
      ) : (
        <UnconfiguredWalletProviders>{children}</UnconfiguredWalletProviders>
      )}
    </QueryClientProvider>
  );
}
