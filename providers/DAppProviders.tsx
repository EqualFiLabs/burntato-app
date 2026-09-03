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
import { createConfig, useSetActiveWallet, WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { useAccount, WagmiProvider as PublicWagmiProvider } from "wagmi";

import { robinhoodTestnet } from "@/lib/burntato/chain";
import {
  defaultWalletState,
  WalletContext,
  type EvmWalletSummary,
  type WalletAction,
  type WalletKind,
  type WalletState,
  type WalletStatus,
} from "./wallet-context";
import { BurntatoBridge, BurntatoContext, defaultBurntatoState } from "./burntato-context";
import { OperatorBridge, OperatorContext, defaultOperatorState } from "./operator-context";

const ROBINHOOD_RPC_VARIABLE = "NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL";

type RuntimeEnvironment = {
  /** Public game reads need only a valid Robinhood testnet RPC. */
  gameConfigured: boolean;
  /** Wallet identity additionally needs a Privy App ID. */
  walletConfigured: boolean;
  appId: string;
  clientId: string | undefined;
  robinhoodRpcUrl: string;
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
function readRuntimeEnvironment(source: {
  NEXT_PUBLIC_PRIVY_APP_ID?: string;
  NEXT_PUBLIC_PRIVY_CLIENT_ID?: string;
  NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL?: string;
}): RuntimeEnvironment {
  const problems: string[] = [];
  const appId = source.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
  const clientId = source.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() ?? "";
  const robinhoodRpcUrl = parsePublicRpcUrl(
    source.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL,
    ROBINHOOD_RPC_VARIABLE,
    problems,
  );
  const gameConfigured = problems.length === 0;

  const environment: RuntimeEnvironment = {
    gameConfigured,
    walletConfigured: gameConfigured && appId.length > 0,
    appId,
    clientId: clientId.length > 0 ? clientId : undefined,
    robinhoodRpcUrl,
  };

  if (problems.length > 0) {
    console.warn(
      `Burntato game data is unavailable: ${problems.join("; ")}. Set the public Robinhood testnet RPC URL to enable live reads.`
    );
  }
  return environment;
}

const runtimeEnvironment = readRuntimeEnvironment({
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_PRIVY_CLIENT_ID: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID,
  NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL,
});

const supportedChains = [robinhoodTestnet] as const;

const wagmiConfig = createConfig({
  chains: supportedChains,
  transports: {
    [robinhoodTestnet.id]: http(runtimeEnvironment.robinhoodRpcUrl),
  },
});

// The shared Privy tenant enables Solana for sibling apps. Burntato is
// intentionally EVM-only, so acknowledge that tenant capability without
// mounting Solana wallet discovery, connectors, RPCs, or plugins here.
const disabledSolanaWalletConnectors = {
  onMount: () => undefined,
  onUnmount: () => undefined,
  get: () => [],
};

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
  const explorer = robinhoodTestnet.blockExplorers?.default.url;
  return explorer ? `${explorer}/address/${address}` : null;
}

function WalletBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, error: privyError, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
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
    const activeAddress = activeWallet?.address ?? null;
    const currentBusyAction: WalletAction = loginPending ? "login" : busyAction;
    return {
      configured: true,
      status,
      authenticated,
      evmWallets,
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
    status,
    wallets,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function ConfiguredWalletProviders({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={runtimeEnvironment.appId}
      clientId={runtimeEnvironment.clientId}
      config={{
        loginMethods: ["wallet", "email"],
        supportedChains: [...supportedChains],
        defaultChain: robinhoodTestnet,
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          solana: { createOnLogin: "off" },
          showWalletUIs: true,
        },
        externalWallets: {
          solana: { connectors: disabledSolanaWalletConnectors },
        },
        appearance: {
          theme: "dark",
          accentColor: "#ff961c",
          walletChainType: "ethereum-only",
        },
      }}
    >
      <PrivyWagmiProvider config={wagmiConfig}>
        <WalletBridge><BurntatoBridge><OperatorBridge>{children}</OperatorBridge></BurntatoBridge></WalletBridge>
      </PrivyWagmiProvider>
    </PrivyProvider>
  );
}

function PublicGameProviders({ children }: { children: ReactNode }) {
  return (
    <PublicWagmiProvider config={wagmiConfig}>
      <WalletContext.Provider value={defaultWalletState}>
        <BurntatoBridge><OperatorBridge>{children}</OperatorBridge></BurntatoBridge>
      </WalletContext.Provider>
    </PublicWagmiProvider>
  );
}

function UnconfiguredProviders({ children }: { children: ReactNode }) {
  return (
    <WalletContext.Provider value={defaultWalletState}>
      <BurntatoContext.Provider value={defaultBurntatoState}>
        <OperatorContext.Provider value={defaultOperatorState}>{children}</OperatorContext.Provider>
      </BurntatoContext.Provider>
    </WalletContext.Provider>
  );
}

export function DAppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {runtimeEnvironment.walletConfigured ? (
        <ConfiguredWalletProviders>{children}</ConfiguredWalletProviders>
      ) : runtimeEnvironment.gameConfigured ? (
        <PublicGameProviders>{children}</PublicGameProviders>
      ) : (
        <UnconfiguredProviders>{children}</UnconfiguredProviders>
      )}
    </QueryClientProvider>
  );
}
