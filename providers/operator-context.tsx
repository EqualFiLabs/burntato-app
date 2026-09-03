"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Abi, Address, Hash, PublicClient } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import {
  activationRegistryAbi,
  erc20Abi,
  faucetAbi,
  genesisDistributorAbi,
  genesisVaultAbi,
  operatorNftAbi,
  operatorRewardsAbi,
} from "@/lib/operators/contracts";
import {
  ZERO_ADDRESS,
  describeOperatorError,
  type OperatorPreview,
  type OperatorRegistration,
  type PurchaseQuote,
} from "@/lib/operators/model";
import { useWalletState } from "./wallet-context";

export type OperatorAction =
  | "faucet"
  | "approve-purchase"
  | "purchase"
  | "approve-activation"
  | "activate"
  | "register-burntato"
  | "sync-burntato"
  | "claim-burntato"
  | "register-launch"
  | "claim-launch-statics"
  | "claim-launch-native";

export type OperatorTransaction = {
  stage: "wallet" | "confirming" | "success" | "error";
  message: string;
  hash?: Hash;
};

type OperatorSnapshot = {
  chainNow: bigint;
  nativeBalance: bigint;
  staticsBalance: bigint;
  faucetBalance: bigint;
  faucetClaimAmount: bigint;
  faucetNextClaimAt: bigint;
  purchaseQuote: PurchaseQuote;
  purchaseAllowance: bigint;
  activationAllowance: bigint;
  purchasesPaused: boolean;
  vaultFinalized: boolean;
  tokenOwner: Address | null;
  tokenInVault: boolean;
  currentTier: number;
  multiplierBps: number;
  tierCosts: readonly bigint[];
  routerRegistration: OperatorRegistration;
  routerPreview: OperatorPreview;
  totalRegisteredWeight: bigint;
  pendingRouterRevenue: bigint;
  totalRouterReceived: bigint;
  launchFinalized: boolean;
  launchRegistered: boolean;
  launchWeight: bigint;
  launchTotalWeight: bigint;
  launchStaticsAsset: Address;
  launchNativeAsset: Address;
  launchStaticsPending: bigint;
  launchNativePending: bigint;
};

const emptyRegistration: OperatorRegistration = {
  owner: ZERO_ADDRESS,
  weight: 0,
  rewardIndex: 0n,
  claimable: 0n,
  rewardRemainder: 0n,
};

const emptyPreview: OperatorPreview = {
  currentOwner: ZERO_ADDRESS,
  currentWeight: 0,
  transferDetected: false,
  claimable: 0n,
  forfeitable: 0n,
  rewardRemainder: 0n,
};

const emptySnapshot: OperatorSnapshot = {
  chainNow: 0n,
  nativeBalance: 0n,
  staticsBalance: 0n,
  faucetBalance: 0n,
  faucetClaimAmount: 200_000n * 10n ** 18n,
  faucetNextClaimAt: 0n,
  purchaseQuote: { staticsPrice: 0n, reserveBuyIn: 0n, nativeFee: 0n, requiredNative: 0n, epochActive: true },
  purchaseAllowance: 0n,
  activationAllowance: 0n,
  purchasesPaused: false,
  vaultFinalized: false,
  tokenOwner: null,
  tokenInVault: false,
  currentTier: 0,
  multiplierBps: 0,
  tierCosts: [0n, 0n, 0n, 0n],
  routerRegistration: emptyRegistration,
  routerPreview: emptyPreview,
  totalRegisteredWeight: 0n,
  pendingRouterRevenue: 0n,
  totalRouterReceived: 0n,
  launchFinalized: false,
  launchRegistered: false,
  launchWeight: 0n,
  launchTotalWeight: 0n,
  launchStaticsAsset: BURNTATO_DEPLOYMENT.statics,
  launchNativeAsset: ZERO_ADDRESS,
  launchStaticsPending: 0n,
  launchNativePending: 0n,
};

type OperatorState = OperatorSnapshot & {
  operatorId: bigint | null;
  setOperatorId: (operatorId: bigint | null) => void;
  loading: boolean;
  error: string | null;
  correctNetwork: boolean;
  transactions: Partial<Record<OperatorAction, OperatorTransaction>>;
  refresh: () => Promise<void>;
  claimFaucet: () => Promise<void>;
  approvePurchase: () => Promise<void>;
  purchase: () => Promise<void>;
  approveActivation: (amount: bigint) => Promise<void>;
  activate: (tier: number) => Promise<void>;
  registerBurntato: () => Promise<void>;
  syncBurntato: () => Promise<void>;
  claimBurntato: () => Promise<void>;
  registerLaunch: () => Promise<void>;
  claimLaunch: (asset: "statics" | "native") => Promise<void>;
};

export const defaultOperatorState: OperatorState = {
  ...emptySnapshot,
  operatorId: null,
  setOperatorId: () => undefined,
  loading: false,
  error: null,
  correctNetwork: false,
  transactions: {},
  refresh: async () => undefined,
  claimFaucet: async () => undefined,
  approvePurchase: async () => undefined,
  purchase: async () => undefined,
  approveActivation: async () => undefined,
  activate: async () => undefined,
  registerBurntato: async () => undefined,
  syncBurntato: async () => undefined,
  claimBurntato: async () => undefined,
  registerLaunch: async () => undefined,
  claimLaunch: async () => undefined,
};

const OperatorContext = createContext<OperatorState>(defaultOperatorState);

function request(address: Address, abi: Abi, functionName: string, args?: readonly unknown[]) {
  return { address, abi, functionName, args } as const;
}

async function read(client: PublicClient, address: Address, abi: Abi, functionName: string, args?: readonly unknown[]): Promise<unknown> {
  return client.readContract(request(address, abi, functionName, args) as never) as Promise<unknown>;
}

async function readOperatorSnapshot(client: PublicClient, account: Address | undefined, operatorId: bigint | null): Promise<OperatorSnapshot> {
  const block = await client.getBlock();
  const accountOrZero = account ?? ZERO_ADDRESS;
  const [nativeBalance, staticsBalance, faucetBalance, faucetClaimAmount, faucetNextClaimAt, purchaseQuote, purchaseAllowance, activationAllowance, purchasesPaused, vaultFinalized, tierCosts, totals, launchBase] = await Promise.all([
    client.getBalance({ address: accountOrZero }),
    read(client, BURNTATO_DEPLOYMENT.statics, erc20Abi, "balanceOf", [accountOrZero]),
    read(client, BURNTATO_DEPLOYMENT.statics, erc20Abi, "balanceOf", [BURNTATO_DEPLOYMENT.faucet]),
    read(client, BURNTATO_DEPLOYMENT.faucet, faucetAbi, "CLAIM_AMOUNT"),
    read(client, BURNTATO_DEPLOYMENT.faucet, faucetAbi, "nextClaimAt", [accountOrZero]),
    read(client, BURNTATO_DEPLOYMENT.genesisVault, genesisVaultAbi, "quoteGenesisPurchase"),
    read(client, BURNTATO_DEPLOYMENT.statics, erc20Abi, "allowance", [accountOrZero, BURNTATO_DEPLOYMENT.genesisVault]),
    read(client, BURNTATO_DEPLOYMENT.statics, erc20Abi, "allowance", [accountOrZero, BURNTATO_DEPLOYMENT.activationRegistry]),
    read(client, BURNTATO_DEPLOYMENT.genesisVault, genesisVaultAbi, "purchasesPaused"),
    read(client, BURNTATO_DEPLOYMENT.genesisVault, genesisVaultAbi, "finalized"),
    Promise.all([1, 2, 3, 4].map((tier) => read(client, BURNTATO_DEPLOYMENT.activationRegistry, activationRegistryAbi, "tierCost", [tier]))),
    Promise.all([
      read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "totalRegisteredWeight"),
      read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "pendingRevenue"),
      read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "totalReceived"),
    ]),
    Promise.all([
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "finalized"),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "totalWeight"),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "statics"),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "numeraire"),
    ]),
  ]);

  let tokenState = {
    tokenOwner: null as Address | null,
    tokenInVault: false,
    currentTier: 0,
    multiplierBps: 0,
    routerRegistration: emptyRegistration,
    routerPreview: emptyPreview,
    launchRegistered: false,
    launchWeight: 0n,
    launchStaticsPending: 0n,
    launchNativePending: 0n,
  };

  const [, , launchStaticsAssetRaw, launchNativeAssetRaw] = launchBase;
  const launchStaticsAsset = launchStaticsAssetRaw as Address;
  const launchNativeAsset = launchNativeAssetRaw as Address;
  if (operatorId !== null) {
    const [owner, inVault, tier, multiplier, registration, preview, launchRegistered, launchWeight, launchStaticsPending, launchNativePending] = await Promise.all([
      read(client, BURNTATO_DEPLOYMENT.operatorNft, operatorNftAbi, "ownerOf", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.genesisVault, genesisVaultAbi, "isVaultInventory", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.activationRegistry, activationRegistryAbi, "tierOf", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.activationRegistry, activationRegistryAbi, "multiplierBps", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "registrationOf", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "previewRewards", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "registered", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "effectiveWeight", [operatorId]),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "pendingGenesis", [operatorId, launchStaticsAsset]),
      read(client, BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "pendingGenesis", [operatorId, launchNativeAsset]),
    ]);
    tokenState = {
      tokenOwner: owner as Address,
      tokenInVault: inVault as boolean,
      currentTier: Number(tier),
      multiplierBps: Number(multiplier),
      routerRegistration: registration as OperatorRegistration,
      routerPreview: preview as OperatorPreview,
      launchRegistered: launchRegistered as boolean,
      launchWeight: launchWeight as bigint,
      launchStaticsPending: launchStaticsPending as bigint,
      launchNativePending: launchNativePending as bigint,
    };
  }

  return {
    chainNow: block.timestamp,
    nativeBalance,
    staticsBalance: staticsBalance as bigint,
    faucetBalance: faucetBalance as bigint,
    faucetClaimAmount: faucetClaimAmount as bigint,
    faucetNextClaimAt: faucetNextClaimAt as bigint,
    purchaseQuote: purchaseQuote as PurchaseQuote,
    purchaseAllowance: purchaseAllowance as bigint,
    activationAllowance: activationAllowance as bigint,
    purchasesPaused: purchasesPaused as boolean,
    vaultFinalized: vaultFinalized as boolean,
    tierCosts: tierCosts as bigint[],
    totalRegisteredWeight: totals[0] as bigint,
    pendingRouterRevenue: totals[1] as bigint,
    totalRouterReceived: totals[2] as bigint,
    launchFinalized: launchBase[0] as boolean,
    launchTotalWeight: launchBase[1] as bigint,
    launchStaticsAsset,
    launchNativeAsset,
    ...tokenState,
  };
}

export function OperatorBridge({ children }: { children: ReactNode }) {
  const wallet = useWalletState();
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BURNTATO_DEPLOYMENT.chainId });
  const { writeContractAsync } = useWriteContract();
  const account = wallet.activeAddress as Address | null;
  const [operatorId, setOperatorId] = useState<bigint | null>(null);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Partial<Record<OperatorAction, OperatorTransaction>>>({});
  const inFlight = useRef(new Set<OperatorAction>());
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const version = ++refreshVersion.current;
    setLoading(true);
    try {
      const next = await readOperatorSnapshot(publicClient as PublicClient, account ?? undefined, operatorId);
      if (version !== refreshVersion.current) return;
      setSnapshot(next);
      setError(null);
    } catch (cause) {
      if (version !== refreshVersion.current) return;
      setError(describeOperatorError(cause));
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [account, operatorId, publicClient]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const run = useCallback(async (action: OperatorAction, address: Address, abi: Abi, functionName: string, args?: readonly unknown[], value?: bigint) => {
    if (!publicClient || !account || inFlight.current.has(action)) return;
    inFlight.current.add(action);
    setError(null);
    setTransactions((current) => ({ ...current, [action]: { stage: "wallet", message: "Confirm in your wallet…" } }));
    try {
      const simulation = await publicClient.simulateContract({ ...request(address, abi, functionName, args), account, value } as never);
      const hash = await writeContractAsync(simulation.request as never);
      setTransactions((current) => ({ ...current, [action]: { stage: "confirming", message: "Waiting for confirmation…", hash } }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setTransactions((current) => ({ ...current, [action]: { stage: "success", message: "Confirmed on Robinhood testnet.", hash } }));
      await refresh();
    } catch (cause) {
      const message = describeOperatorError(cause);
      setError(message);
      setTransactions((current) => ({ ...current, [action]: { stage: "error", message } }));
    } finally {
      inFlight.current.delete(action);
    }
  }, [account, publicClient, refresh, writeContractAsync]);

  const requireId = useCallback(() => operatorId, [operatorId]);
  const value = useMemo<OperatorState>(() => ({
    ...snapshot,
    operatorId,
    setOperatorId,
    loading,
    error,
    correctNetwork: chainId === BURNTATO_DEPLOYMENT.chainId,
    transactions,
    refresh,
    claimFaucet: () => run("faucet", BURNTATO_DEPLOYMENT.faucet, faucetAbi, "claim"),
    approvePurchase: () => run("approve-purchase", BURNTATO_DEPLOYMENT.statics, erc20Abi, "approve", [BURNTATO_DEPLOYMENT.genesisVault, snapshot.purchaseQuote.staticsPrice]),
    purchase: async () => {
      const id = requireId();
      if (id !== null && account) await run("purchase", BURNTATO_DEPLOYMENT.genesisVault, genesisVaultAbi, "buyGenesis", [id, account], snapshot.purchaseQuote.requiredNative);
    },
    approveActivation: (amount) => run("approve-activation", BURNTATO_DEPLOYMENT.statics, erc20Abi, "approve", [BURNTATO_DEPLOYMENT.activationRegistry, amount]),
    activate: async (tier) => {
      const id = requireId();
      if (id !== null) await run("activate", BURNTATO_DEPLOYMENT.activationRegistry, activationRegistryAbi, "activate", [id, tier]);
    },
    registerBurntato: async () => {
      const id = requireId();
      if (id !== null) await run("register-burntato", BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "register", [id]);
    },
    syncBurntato: async () => {
      const id = requireId();
      if (id !== null) await run("sync-burntato", BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "sync", [id]);
    },
    claimBurntato: async () => {
      const id = requireId();
      if (id !== null && account) await run("claim-burntato", BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "claim", [id, account]);
    },
    registerLaunch: async () => {
      const id = requireId();
      if (id !== null) await run("register-launch", BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "registerGenesis", [id]);
    },
    claimLaunch: async (asset) => {
      const id = requireId();
      if (id !== null && account) {
        await run(asset === "statics" ? "claim-launch-statics" : "claim-launch-native", BURNTATO_DEPLOYMENT.genesisLaunchDistributor, genesisDistributorAbi, "claimGenesis", [id, asset === "statics" ? snapshot.launchStaticsAsset : snapshot.launchNativeAsset, account]);
      }
    },
  }), [account, chainId, error, loading, operatorId, refresh, requireId, run, snapshot, transactions]);

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperatorState(): OperatorState {
  return useContext(OperatorContext);
}

export { OperatorContext };
