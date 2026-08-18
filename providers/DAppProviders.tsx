"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  type WalletAction,
  type WalletKind,
  type WalletState,
  type WalletStatus,
} from "./wallet-context";

const RPC_VARIABLE_NAMES = [
  "NEXT_PUBLIC_ETHEREUM_RPC_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
  "NEXT_PUBLIC_ARBITRUM_RPC_URL",
] as const;

type PrivyEnvironment = {
  /** True only when Privy and every wallet RPC variable are present and valid. */
  configured: boolean;
  appId: string;
  clientId: string | undefined;
  ethereumRpcUrl: string;
  baseRpcUrl: string;
  arbitrumRpcUrl: string;
};

/**
 * Accepts only absolute, credential-free HTTP(S) URLs so a misconfigured
 * endpoint fails loudly instead of quietly degrading the wallet runtime.
 */
function parsePublicRpcUrl(value: string | undefined, variableName: string, problems: string[]): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    problems.push(`${variableName} is not set`);
    return "";
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    problems.push(`${variableName} is not an absolute HTTP(S) URL`);
    return "";
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    problems.push(`${variableName} is not a credential-free HTTP(S) URL`);
    return "";
  }
  return url.toString();
}

/**
 * Every variable is read through explicit static `process.env` property
 * references so Next.js inlines identical values into the server and browser
 * bundles. An indirect `process.env` object would leave the browser with
 * undefined values and cause a configured/unconfigured hydration mismatch.
 */
function readPrivyEnvironment(source: {
  NEXT_PUBLIC_PRIVY_APP_ID?: string;
  NEXT_PUBLIC_PRIVY_CLIENT_ID?: string;
  NEXT_PUBLIC_ETHEREUM_RPC_URL?: string;
  NEXT_PUBLIC_BASE_RPC_URL?: string;
  NEXT_PUBLIC_ARBITRUM_RPC_URL?: string;
}): PrivyEnvironment {
  const problems: string[] = [];
  const appId = source.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
  const clientId = source.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() ?? "";
  if (!appId) problems.push("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  const ethereumRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_ETHEREUM_RPC_URL, RPC_VARIABLE_NAMES[0], problems);
  const baseRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_BASE_RPC_URL, RPC_VARIABLE_NAMES[1], problems);
  const arbitrumRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_ARBITRUM_RPC_URL, RPC_VARIABLE_NAMES[2], problems);

  const environment: PrivyEnvironment = {
    configured: problems.length === 0,
    appId,
    clientId: clientId.length > 0 ? clientId : undefined,
    ethereumRpcUrl,
    baseRpcUrl,
    arbitrumRpcUrl,
  };

  if (problems.length > 0) {
    console.warn(
      `Burntato wallets are unavailable: ${problems.join("; ")}. Set the public wallet environment variables to enable sign in.`
    );
  }
  return environment;
}

const walletEnvironment = readPrivyEnvironment({
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_PRIVY_CLIENT_ID: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
  NEXT_PUBLIC_ETHEREUM_RPC_URL: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
  NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  NEXT_PUBLIC_ARBITRUM_RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
});

// Ethereum mainnet is the home chain; Base and Arbitrum are available because
// the Portal will eventually bridge there.
const supportedChains = [mainnet, base, arbitrum] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(walletEnvironment.ethereumRpcUrl),
    [base.id]: http(walletEnvironment.baseRpcUrl),
    [arbitrum.id]: http(walletEnvironment.arbitrumRpcUrl),
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

/** Maps provider failures onto stable, human-readable feedback without internals. */
function describeWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("cancel") || normalized.includes("close") || normalized.includes("reject")) {
    return "The wallet request was cancelled.";
  }
  if (normalized.includes("switch")) {
    return "The active wallet could not be switched. Try again.";
  }
  return "The wallet request failed. Try again.";
}

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

function explorerUrlFor(address: string | null): string | null {
  if (!address) return null;
  const explorer = mainnet.blockExplorers?.default.url;
  return explorer ? `${explorer}/address/${address}` : null;
}

function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, error: privyError, login, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { address: wagmiAddress } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const [busyAction, setBusyAction] = useState<WalletAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestedExternalAddress, setRequestedExternalAddress] = useState<string | null>(null);

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      setBusyAction(null);
      if (wallet.type !== "ethereum") {
        // The ethereum-only modal should never produce a Solana wallet here.
        setActionError("Only an EVM wallet can be activated.");
        return;
      }
      setRequestedExternalAddress(wallet.address);
    },
    onError: (error) => {
      setBusyAction(null);
      setActionError(describeWalletError(error));
    },
  });

  const runAction = useCallback(
    async (action: Exclude<WalletAction, null>, operation: () => Promise<unknown>) => {
      setActionError(null);
      setBusyAction(action);
      try {
        await operation();
      } catch (error) {
        setActionError(describeWalletError(error));
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  // Activates a freshly connected external wallet once it appears in the
  // wallet list. The connect-external busy state covers this whole span so
  // duplicate clicks stay blocked until activation settles.
  useEffect(() => {
    if (!requestedExternalAddress) return;
    const wallet = wallets.find((candidate) => sameAddress(candidate.address, requestedExternalAddress));
    if (!wallet) return;
    let cancelled = false;
    setActiveWallet(wallet)
      .then(() => {
        if (!cancelled) setRequestedExternalAddress(null);
      })
      .catch(() => {
        if (!cancelled) setActionError("The connected wallet could not be activated.");
      })
      .finally(() => {
        if (!cancelled) setBusyAction(null);
      });
    return () => {
      cancelled = true;
    };
  }, [requestedExternalAddress, setActiveWallet, wallets]);

  const activeWallet = resolveActiveWallet(wallets, wagmiAddress);

  let status: WalletStatus = "loading";
  if (privyError) status = "error";
  else if (ready && !authenticated) status = "signed-out";
  else if (ready && authenticated && walletsReady) status = activeWallet ? "ready" : "wallet-missing";

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
      explorerUrl: explorerUrlFor(activeAddress),
      busyAction,
      error: actionError ?? (status === "error" ? describeWalletError(privyError) : null),
      login: () => {
        setActionError(null);
        login();
      },
      logout: () => void runAction("logout", () => logout()),
      connectExternalWallet: () => {
        if (busyAction) return;
        setActionError(null);
        setBusyAction("connect-external");
        connectWallet({ walletChainType: "ethereum-only" });
      },
      selectEvmWallet: (address: string) => {
        const wallet = wallets.find((candidate) => sameAddress(candidate.address, address));
        if (wallet) void runAction("select", () => setActiveWallet(wallet));
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
    actionError,
    activeWallet,
    authenticated,
    busyAction,
    connectWallet,
    login,
    logout,
    privyError,
    runAction,
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
      appId={walletEnvironment.appId}
      clientId={walletEnvironment.clientId}
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
  // renders normally in a signed-out shape without wallet environment values.
  return <WalletContext.Provider value={defaultWalletState}>{children}</WalletContext.Provider>;
}

export function DAppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {walletEnvironment.configured ? (
        <ConfiguredWalletProviders>{children}</ConfiguredWalletProviders>
      ) : (
        <UnconfiguredWalletProviders>{children}</UnconfiguredWalletProviders>
      )}
    </QueryClientProvider>
  );
}
