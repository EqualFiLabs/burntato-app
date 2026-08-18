"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getEmbeddedConnectedWallet,
  PrivyProvider,
  useConnectWallet,
  useLogin,
  useModalStatus,
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
import { arbitrum, base, mainnet, sepolia } from "viem/chains";
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
import { BurntatoBridge, BurntatoContext, defaultBurntatoState } from "./burntato-context";

const RPC_VARIABLE_NAMES = [
  "NEXT_PUBLIC_ETHEREUM_RPC_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
  "NEXT_PUBLIC_ARBITRUM_RPC_URL",
  "NEXT_PUBLIC_SEPOLIA_RPC_URL",
] as const;

type PrivyEnvironment = {
  /** True only when Privy and every wallet RPC variable are present and valid. */
  configured: boolean;
  appId: string;
  clientId: string | undefined;
  ethereumRpcUrl: string;
  baseRpcUrl: string;
  arbitrumRpcUrl: string;
  sepoliaRpcUrl: string;
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
  NEXT_PUBLIC_SEPOLIA_RPC_URL?: string;
}): PrivyEnvironment {
  const problems: string[] = [];
  const appId = source.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
  const clientId = source.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() ?? "";
  if (!appId) problems.push("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  const ethereumRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_ETHEREUM_RPC_URL, RPC_VARIABLE_NAMES[0], problems);
  const baseRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_BASE_RPC_URL, RPC_VARIABLE_NAMES[1], problems);
  const arbitrumRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_ARBITRUM_RPC_URL, RPC_VARIABLE_NAMES[2], problems);
  const sepoliaRpcUrl = parsePublicRpcUrl(source.NEXT_PUBLIC_SEPOLIA_RPC_URL, RPC_VARIABLE_NAMES[3], problems);

  const environment: PrivyEnvironment = {
    configured: problems.length === 0,
    appId,
    clientId: clientId.length > 0 ? clientId : undefined,
    ethereumRpcUrl,
    baseRpcUrl,
    arbitrumRpcUrl,
    sepoliaRpcUrl,
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
  NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
});

// Sepolia is the disposable game's home chain. Mainnet, Base, and Arbitrum
// remain available for the future Portal plumbing.
const supportedChains = [sepolia, mainnet, base, arbitrum] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(walletEnvironment.ethereumRpcUrl),
    [base.id]: http(walletEnvironment.baseRpcUrl),
    [arbitrum.id]: http(walletEnvironment.arbitrumRpcUrl),
    [sepolia.id]: http(walletEnvironment.sepoliaRpcUrl),
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
  if (
    normalized.includes("cancel") ||
    normalized.includes("close") ||
    normalized.includes("exit") ||
    normalized.includes("reject")
  ) {
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
  const explorer = sepolia.blockExplorers?.default.url;
  return explorer ? `${explorer}/address/${address}` : null;
}

function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, error: privyError, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { isOpen: isPrivyModalOpen } = useModalStatus();
  const { address: wagmiAddress } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const [busyAction, setBusyAction] = useState<WalletAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [requestedExternalAddress, setRequestedExternalAddress] = useState<string | null>(null);
  const loginModalOpened = useRef(false);

  const { login } = useLogin({
    onComplete: () => {
      loginModalOpened.current = false;
      setLoginPending(false);
    },
    onError: (error) => {
      loginModalOpened.current = false;
      setLoginPending(false);
      setActionError(describeWalletError(error));
    },
  });

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      if (wallet.type !== "ethereum") {
        // The ethereum-only modal should never produce a Solana wallet here.
        setBusyAction(null);
        setActionError("Only an EVM wallet can be activated.");
        return;
      }
      setRequestedExternalAddress(wallet.address);
    },
    onError: (error) => {
      setRequestedExternalAddress(null);
      setBusyAction(null);
      setActionError(describeWalletError(error));
    },
  });

  useEffect(() => {
    if (!loginPending) return;
    if (isPrivyModalOpen) {
      loginModalOpened.current = true;
      return;
    }
    if (loginModalOpened.current) {
      loginModalOpened.current = false;
      setLoginPending(false);
    }
  }, [isPrivyModalOpen, loginPending]);

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
    if (!wallet) {
      const timeout = window.setTimeout(() => {
        setRequestedExternalAddress(null);
        setBusyAction(null);
        setActionError("The connected wallet could not be activated. Try again.");
      }, 10_000);
      return () => window.clearTimeout(timeout);
    }
    let cancelled = false;
    setActiveWallet(wallet)
      .then(() => {
        if (!cancelled) setRequestedExternalAddress(null);
      })
      .catch(() => {
        if (!cancelled) {
          setRequestedExternalAddress(null);
          setActionError("The connected wallet could not be activated.");
        }
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
    const currentBusyAction: WalletAction = loginPending ? "login" : busyAction;
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
      busyAction: currentBusyAction,
      error: actionError ?? (status === "error" ? describeWalletError(privyError) : null),
      login: () => {
        if (currentBusyAction) return;
        setActionError(null);
        setLoginPending(true);
        login();
      },
      logout: () => {
        if (currentBusyAction) return;
        void runAction("logout", () => logout());
      },
      connectExternalWallet: () => {
        if (currentBusyAction) return;
        setActionError(null);
        setBusyAction("connect-external");
        connectWallet({ walletChainType: "ethereum-only" });
      },
      selectEvmWallet: (address: string) => {
        if (currentBusyAction) return;
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
    loginPending,
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
        defaultChain: sepolia,
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
        <WalletBridge><BurntatoBridge>{children}</BurntatoBridge></WalletBridge>
      </WagmiProvider>
    </PrivyProvider>
  );
}

function UnconfiguredWalletProviders({ children }: { children: ReactNode }) {
  // The module-level defaultWalletState keeps a stable identity, so the app
  // renders normally in a signed-out shape without wallet environment values.
  return (
    <WalletContext.Provider value={defaultWalletState}>
      <BurntatoContext.Provider value={defaultBurntatoState}>{children}</BurntatoContext.Provider>
    </WalletContext.Provider>
  );
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
