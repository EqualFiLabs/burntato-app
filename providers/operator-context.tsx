"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Abi, type Address, type Hash, type PublicClient } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { operatorRewardsAbi } from "@/lib/operators/contracts";
import {
  describeOperatorError,
  operatorActionBatches,
  operatorPreviewFromResult,
  type OwnedOperatorReward,
  type OperatorPreviewResult,
  type OperatorRegistration,
} from "@/lib/operators/model";
import { discoverOwnedOperatorIds } from "@/lib/operators/ownership";
import { useWalletState } from "./wallet-context";

export type OperatorAction =
  | "register-burntato-batch"
  | "sync-burntato-batch"
  | "claim-burntato-batch";

export type OperatorTransaction = {
  stage: "wallet" | "confirming" | "success" | "error";
  message: string;
  hash?: Hash;
};

type OperatorState = {
  ownedOperatorIds: readonly bigint[];
  ownedOperatorsLoading: boolean;
  batchRegisterOperatorIds: readonly bigint[];
  batchSyncOperatorIds: readonly bigint[];
  batchClaimOperatorIds: readonly bigint[];
  batchClaimable: bigint;
  walletRegisteredWeight: bigint;
  totalRegisteredWeight: bigint;
  totalRegisteredOperators: bigint;
  loading: boolean;
  error: string | null;
  correctNetwork: boolean;
  transactions: Partial<Record<OperatorAction, OperatorTransaction>>;
  refresh: () => Promise<void>;
  registerAllBurntato: () => Promise<void>;
  syncAllBurntato: () => Promise<void>;
  claimAllBurntato: () => Promise<void>;
};

export const defaultOperatorState: OperatorState = {
  ownedOperatorIds: [],
  ownedOperatorsLoading: false,
  batchRegisterOperatorIds: [],
  batchSyncOperatorIds: [],
  batchClaimOperatorIds: [],
  batchClaimable: 0n,
  walletRegisteredWeight: 0n,
  totalRegisteredWeight: 0n,
  totalRegisteredOperators: 0n,
  loading: false,
  error: null,
  correctNetwork: false,
  transactions: {},
  refresh: async () => undefined,
  registerAllBurntato: async () => undefined,
  syncAllBurntato: async () => undefined,
  claimAllBurntato: async () => undefined,
};

const OperatorContext = createContext<OperatorState>(defaultOperatorState);
function request(address: Address, abi: Abi, functionName: string, args?: readonly unknown[]) {
  return { address, abi, functionName, args } as const;
}

type OperatorSummary = ReturnType<typeof operatorActionBatches> & {
  totalRegisteredWeight: bigint;
  totalRegisteredOperators: bigint;
};

async function readOperatorSummary(client: PublicClient, account: Address | null, operatorIds: readonly bigint[]): Promise<OperatorSummary> {
  const router = BURNTATO_DEPLOYMENT.operatorRewardsRouter;
  const contracts = [
    request(router, operatorRewardsAbi, "totalRegisteredWeight"),
    request(router, operatorRewardsAbi, "totalRegisteredOperators"),
    ...operatorIds.flatMap((operatorId) => [
      request(router, operatorRewardsAbi, "registrationOf", [operatorId]),
      request(router, operatorRewardsAbi, "previewRewards", [operatorId]),
    ]),
  ];
  const results = await client.multicall({ contracts: contracts as never, allowFailure: false }) as readonly unknown[];
  const rewards: OwnedOperatorReward[] = operatorIds.map((operatorId, index) => ({
    operatorId,
    registration: results[2 + index * 2] as OperatorRegistration,
    preview: operatorPreviewFromResult(results[3 + index * 2] as OperatorPreviewResult),
  }));
  return {
    ...operatorActionBatches(account, rewards),
    totalRegisteredWeight: results[0] as bigint,
    totalRegisteredOperators: results[1] as bigint,
  };
}

export function OperatorBridge({ children }: { children: ReactNode }) {
  const wallet = useWalletState();
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BURNTATO_DEPLOYMENT.chainId });
  const { writeContractAsync } = useWriteContract();
  const account = wallet.activeAddress as Address | null;
  const [ownedOperatorIds, setOwnedOperatorIds] = useState<bigint[]>([]);
  const [ownedOperatorsLoading, setOwnedOperatorsLoading] = useState(false);
  const [batchRegisterOperatorIds, setBatchRegisterOperatorIds] = useState<bigint[]>([]);
  const [batchSyncOperatorIds, setBatchSyncOperatorIds] = useState<bigint[]>([]);
  const [batchClaimOperatorIds, setBatchClaimOperatorIds] = useState<bigint[]>([]);
  const [batchClaimable, setBatchClaimable] = useState(0n);
  const [walletRegisteredWeight, setWalletRegisteredWeight] = useState(0n);
  const [totalRegisteredWeight, setTotalRegisteredWeight] = useState(0n);
  const [totalRegisteredOperators, setTotalRegisteredOperators] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Partial<Record<OperatorAction, OperatorTransaction>>>({});
  const inFlight = useRef(new Set<OperatorAction>());
  const refreshVersion = useRef(0);
  const ownershipVersion = useRef(0);

  useEffect(() => {
    const version = ++ownershipVersion.current;
    const initial = window.setTimeout(() => {
      if (!publicClient || !account) {
        setOwnedOperatorIds([]);
        setBatchRegisterOperatorIds([]);
        setBatchSyncOperatorIds([]);
        setBatchClaimOperatorIds([]);
        setBatchClaimable(0n);
        setWalletRegisteredWeight(0n);
        setOwnedOperatorsLoading(false);
        return;
      }
      setOwnedOperatorsLoading(true);
      void discoverOwnedOperatorIds(publicClient as PublicClient, account)
        .then((ids) => {
          if (version !== ownershipVersion.current) return;
          setOwnedOperatorIds(ids);
          setError(null);
        })
        .catch((cause) => {
          if (version !== ownershipVersion.current) return;
          setOwnedOperatorIds([]);
          setError(describeOperatorError(cause));
        })
        .finally(() => {
          if (version === ownershipVersion.current) setOwnedOperatorsLoading(false);
        });
    }, 0);
    return () => window.clearTimeout(initial);
  }, [account, publicClient]);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const version = ++refreshVersion.current;
    setLoading(ownedOperatorIds.length !== 0);
    try {
      const summary = await readOperatorSummary(publicClient as PublicClient, account, ownedOperatorIds);
      if (version !== refreshVersion.current) return;
      setBatchRegisterOperatorIds(summary.registerOperatorIds);
      setBatchSyncOperatorIds(summary.syncOperatorIds);
      setBatchClaimOperatorIds(summary.claimOperatorIds);
      setBatchClaimable(summary.claimable);
      setWalletRegisteredWeight(summary.registeredWeight);
      setTotalRegisteredWeight(summary.totalRegisteredWeight);
      setTotalRegisteredOperators(summary.totalRegisteredOperators);
      setError(null);
    } catch (cause) {
      if (version !== refreshVersion.current) return;
      setError(describeOperatorError(cause));
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [account, ownedOperatorIds, publicClient]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const run = useCallback(async (action: OperatorAction, functionName: string, args: readonly unknown[]) => {
    if (!publicClient || !account || inFlight.current.has(action)) return;
    inFlight.current.add(action);
    setError(null);
    setTransactions((current) => ({ ...current, [action]: { stage: "wallet", message: "Confirm in your wallet…" } }));
    try {
      const simulation = await publicClient.simulateContract({
        ...request(BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, functionName, args),
        account,
      } as never);
      const hash = await writeContractAsync(simulation.request as never);
      setTransactions((current) => ({ ...current, [action]: { stage: "confirming", message: "Waiting for confirmation…", hash } }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setTransactions((current) => ({ ...current, [action]: { stage: "success", message: `Confirmed on ${BURNTATO_DEPLOYMENT.network}.`, hash } }));
      await refresh();
    } catch (cause) {
      const message = describeOperatorError(cause);
      setError(message);
      setTransactions((current) => ({ ...current, [action]: { stage: "error", message } }));
    } finally {
      inFlight.current.delete(action);
    }
  }, [account, publicClient, refresh, writeContractAsync]);

  const value = useMemo<OperatorState>(() => ({
    ownedOperatorIds,
    ownedOperatorsLoading,
    batchRegisterOperatorIds,
    batchSyncOperatorIds,
    batchClaimOperatorIds,
    batchClaimable,
    walletRegisteredWeight,
    totalRegisteredWeight,
    totalRegisteredOperators,
    loading,
    error,
    correctNetwork: chainId === BURNTATO_DEPLOYMENT.chainId,
    transactions,
    refresh,
    registerAllBurntato: async () => {
      if (batchRegisterOperatorIds.length > 0) {
        await run("register-burntato-batch", "registerBatch", [batchRegisterOperatorIds]);
      }
    },
    syncAllBurntato: async () => {
      if (batchSyncOperatorIds.length > 0) {
        await run("sync-burntato-batch", "syncBatch", [batchSyncOperatorIds]);
      }
    },
    claimAllBurntato: async () => {
      if (batchClaimOperatorIds.length > 0 && account) {
        await run("claim-burntato-batch", "claimBatch", [batchClaimOperatorIds, account]);
      }
    },
  }), [account, batchClaimable, batchClaimOperatorIds, batchRegisterOperatorIds, batchSyncOperatorIds, chainId, error, loading, ownedOperatorIds, ownedOperatorsLoading, refresh, run, totalRegisteredOperators, totalRegisteredWeight, transactions, walletRegisteredWeight]);

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperatorState(): OperatorState {
  return useContext(OperatorContext);
}

export { OperatorContext };
