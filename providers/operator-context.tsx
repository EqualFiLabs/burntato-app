"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Abi, type Address, type Hash, type PublicClient } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { operatorNftAbi, operatorRewardsAbi } from "@/lib/operators/contracts";
import {
  ZERO_ADDRESS,
  describeOperatorError,
  type OperatorPreview,
  type OperatorRegistration,
} from "@/lib/operators/model";
import { discoverOwnedOperatorIds } from "@/lib/operators/ownership";
import { useWalletState } from "./wallet-context";

export type OperatorAction = "register-burntato" | "sync-burntato" | "claim-burntato";

export type OperatorTransaction = {
  stage: "wallet" | "confirming" | "success" | "error";
  message: string;
  hash?: Hash;
};

type OperatorSnapshot = {
  tokenOwner: Address | null;
  routerRegistration: OperatorRegistration;
  routerPreview: OperatorPreview;
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
  tokenOwner: null,
  routerRegistration: emptyRegistration,
  routerPreview: emptyPreview,
};

type OperatorState = OperatorSnapshot & {
  operatorId: bigint | null;
  setOperatorId: (operatorId: bigint | null) => void;
  ownedOperatorIds: readonly bigint[];
  ownedOperatorsLoading: boolean;
  loading: boolean;
  error: string | null;
  correctNetwork: boolean;
  transactions: Partial<Record<OperatorAction, OperatorTransaction>>;
  refresh: () => Promise<void>;
  registerBurntato: () => Promise<void>;
  syncBurntato: () => Promise<void>;
  claimBurntato: () => Promise<void>;
};

export const defaultOperatorState: OperatorState = {
  ...emptySnapshot,
  operatorId: null,
  setOperatorId: () => undefined,
  ownedOperatorIds: [],
  ownedOperatorsLoading: false,
  loading: false,
  error: null,
  correctNetwork: false,
  transactions: {},
  refresh: async () => undefined,
  registerBurntato: async () => undefined,
  syncBurntato: async () => undefined,
  claimBurntato: async () => undefined,
};

const OperatorContext = createContext<OperatorState>(defaultOperatorState);
function request(address: Address, abi: Abi, functionName: string, args?: readonly unknown[]) {
  return { address, abi, functionName, args } as const;
}

async function read(client: PublicClient, address: Address, abi: Abi, functionName: string, args?: readonly unknown[]): Promise<unknown> {
  return client.readContract(request(address, abi, functionName, args) as never) as Promise<unknown>;
}

async function readOperatorSnapshot(client: PublicClient, operatorId: bigint | null): Promise<OperatorSnapshot> {
  if (operatorId === null) return emptySnapshot;
  const [tokenOwner, routerRegistration, routerPreview] = await Promise.all([
    read(client, BURNTATO_DEPLOYMENT.operatorNft, operatorNftAbi, "ownerOf", [operatorId]),
    read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "registrationOf", [operatorId]),
    read(client, BURNTATO_DEPLOYMENT.operatorRewardsRouter, operatorRewardsAbi, "previewRewards", [operatorId]),
  ]);
  return {
    tokenOwner: tokenOwner as Address,
    routerRegistration: routerRegistration as OperatorRegistration,
    routerPreview: routerPreview as OperatorPreview,
  };
}

export function OperatorBridge({ children }: { children: ReactNode }) {
  const wallet = useWalletState();
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BURNTATO_DEPLOYMENT.chainId });
  const { writeContractAsync } = useWriteContract();
  const account = wallet.activeAddress as Address | null;
  const [operatorId, setOperatorId] = useState<bigint | null>(null);
  const [ownedOperatorIds, setOwnedOperatorIds] = useState<bigint[]>([]);
  const [ownedOperatorsLoading, setOwnedOperatorsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
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
        setOperatorId(null);
        setOwnedOperatorsLoading(false);
        return;
      }
      setOwnedOperatorsLoading(true);
      void discoverOwnedOperatorIds(publicClient as PublicClient, account)
        .then((ids) => {
          if (version !== ownershipVersion.current) return;
          setOwnedOperatorIds(ids);
          setOperatorId((current) => current !== null && ids.includes(current) ? current : (ids[0] ?? null));
          setError(null);
        })
        .catch((cause) => {
          if (version !== ownershipVersion.current) return;
          setOwnedOperatorIds([]);
          setOperatorId(null);
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
    setLoading(operatorId !== null);
    try {
      const next = await readOperatorSnapshot(publicClient as PublicClient, operatorId);
      if (version !== refreshVersion.current) return;
      setSnapshot(next);
      setError(null);
    } catch (cause) {
      if (version !== refreshVersion.current) return;
      setError(describeOperatorError(cause));
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [operatorId, publicClient]);

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
    ...snapshot,
    operatorId,
    setOperatorId,
    ownedOperatorIds,
    ownedOperatorsLoading,
    loading,
    error,
    correctNetwork: chainId === BURNTATO_DEPLOYMENT.chainId,
    transactions,
    refresh,
    registerBurntato: async () => {
      if (operatorId !== null) await run("register-burntato", "register", [operatorId]);
    },
    syncBurntato: async () => {
      if (operatorId !== null) await run("sync-burntato", "sync", [operatorId]);
    },
    claimBurntato: async () => {
      if (operatorId !== null && account) await run("claim-burntato", "claim", [operatorId, account]);
    },
  }), [account, chainId, error, loading, operatorId, ownedOperatorIds, ownedOperatorsLoading, refresh, run, snapshot, transactions]);

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperatorState(): OperatorState {
  return useContext(OperatorContext);
}

export { OperatorContext };
