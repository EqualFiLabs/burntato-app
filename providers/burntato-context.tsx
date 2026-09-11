"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Address, PublicClient } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import {
  buildLeaderboard,
  candidateRoundIds,
  dedupeEvents,
  fetchIndexedHistory,
  scanBurntatoEvents,
  type BurntatoEvent,
  type LeaderboardRow,
  type RewardCandidate,
} from "@/lib/burntato/history";
import { describeBurntatoError, deriveRoundPhase, type BurntatoRound, type RoundConfig, type RoundPhase } from "@/lib/burntato/model";
import {
  canStartTransaction,
  hasAnyTransactionPending,
  hasGameplayTransactionPending,
  type TransactionAction,
  type TransactionState,
  type Transactions,
} from "@/lib/burntato/transactions";
import { useWalletState } from "./wallet-context";

type BurntatoState = {
  configured: boolean;
  chainId: number | undefined;
  correctNetwork: boolean;
  chainNow: bigint;
  currentRoundId: bigint;
  currentRound: BurntatoRound | null;
  protocolConfig: RoundConfig | null;
  phase: RoundPhase;
  currentEmission: readonly [bigint, bigint];
  purchasesPaused: boolean;
  commitmentsPaused: boolean;
  potatoBalance: bigint;
  targetRoundId: bigint;
  ownCommitment: bigint;
  totalCommitment: bigint;
  activeRecoveryCommitment: bigint;
  activeRecoveryTotalCommitment: bigint;
  genesisWinnerReserve: bigint;
  genesisTreasuryBudget: bigint;
  loading: boolean;
  readError: string | null;
  history: BurntatoEvent[];
  historyLoading: boolean;
  historyError: string | null;
  leaderboard: LeaderboardRow[];
  rewards: RewardCandidate[];
  lifetimeClaimed: bigint;
  transactions: Transactions;
  latestTransaction: TransactionState | null;
  gameplayTransactionPending: boolean;
  networkSwitchBlocked: boolean;
  switchToRobinhood: () => void;
  refresh: () => Promise<void>;
  grab: () => Promise<void>;
  settle: () => Promise<void>;
  collect: () => Promise<void>;
  commit: (amount: bigint) => Promise<void>;
  claim: (reward: RewardCandidate) => Promise<void>;
  dismissTransactionNotice: () => void;
};

export const defaultBurntatoState: BurntatoState = {
  configured: false,
  chainId: undefined,
  correctNetwork: false,
  chainNow: 0n,
  currentRoundId: 0n,
  currentRound: null,
  protocolConfig: null,
  phase: "unstarted",
  currentEmission: [0n, 0n],
  purchasesPaused: false,
  commitmentsPaused: false,
  potatoBalance: 0n,
  targetRoundId: 1n,
  ownCommitment: 0n,
  totalCommitment: 0n,
  activeRecoveryCommitment: 0n,
  activeRecoveryTotalCommitment: 0n,
  genesisWinnerReserve: 0n,
  genesisTreasuryBudget: 0n,
  loading: false,
  readError: null,
  history: [],
  historyLoading: false,
  historyError: null,
  leaderboard: [],
  rewards: [],
  lifetimeClaimed: 0n,
  transactions: {},
  latestTransaction: null,
  gameplayTransactionPending: false,
  networkSwitchBlocked: false,
  switchToRobinhood: () => undefined,
  refresh: async () => undefined,
  grab: async () => undefined,
  settle: async () => undefined,
  collect: async () => undefined,
  commit: async () => undefined,
  claim: async () => undefined,
  dismissTransactionNotice: () => undefined,
};

const BurntatoContext = createContext<BurntatoState>(defaultBurntatoState);

type Snapshot = Pick<BurntatoState,
  "chainNow" | "currentRoundId" | "currentRound" | "protocolConfig" | "currentEmission" |
  "purchasesPaused" | "commitmentsPaused" | "potatoBalance" | "targetRoundId" | "ownCommitment" | "totalCommitment" |
  "activeRecoveryCommitment" | "activeRecoveryTotalCommitment" | "genesisWinnerReserve" | "genesisTreasuryBudget"
>;

const emptySnapshot: Snapshot = {
  chainNow: 0n,
  currentRoundId: 0n,
  currentRound: null,
  protocolConfig: null,
  currentEmission: [0n, 0n],
  purchasesPaused: false,
  commitmentsPaused: false,
  potatoBalance: 0n,
  targetRoundId: 1n,
  ownCommitment: 0n,
  totalCommitment: 0n,
  activeRecoveryCommitment: 0n,
  activeRecoveryTotalCommitment: 0n,
  genesisWinnerReserve: 0n,
  genesisTreasuryBudget: 0n,
};

function contractRequest(functionName: string, args?: readonly unknown[]) {
  return { address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName, args } as const;
}

function readContract(client: PublicClient, functionName: string, args?: readonly unknown[]): Promise<unknown> {
  return client.readContract(contractRequest(functionName, args) as never) as Promise<unknown>;
}

async function readSnapshot(client: PublicClient, account: Address | undefined): Promise<Snapshot> {
  const block = await client.getBlock();
  const [roundIdRaw, configRaw, pausedRaw, purchasesInitializedRaw] = await Promise.all([
    readContract(client, "currentRoundId"),
    readContract(client, "protocolConfig"),
    readContract(client, "paused"),
    readContract(client, "purchasesInitialized"),
  ]);
  const currentRoundId = roundIdRaw as bigint;
  const targetRoundId = currentRoundId + 1n;
  const [roundRaw, emissionRaw, balanceRaw, ownRaw, totalRaw, activeOwnRaw, activeTotalRaw, winnerReserveRaw, treasuryBudgetRaw] = await Promise.all([
    currentRoundId === 0n ? Promise.resolve(null) : readContract(client, "getRound", [currentRoundId]),
    currentRoundId === 0n ? Promise.resolve([0n, 0n] as const) : readContract(client, "currentEarnedEmission"),
    account ? readContract(client, "balanceOf", [account]) : Promise.resolve(0n),
    account ? readContract(client, "recoveryCommitment", [targetRoundId, account]) : Promise.resolve(0n),
    readContract(client, "totalRecoveryCommitment", [targetRoundId]),
    account && currentRoundId !== 0n ? readContract(client, "recoveryCommitment", [currentRoundId, account]) : Promise.resolve(0n),
    currentRoundId !== 0n ? readContract(client, "totalRecoveryCommitment", [currentRoundId]) : Promise.resolve(0n),
    currentRoundId === 0n ? readContract(client, "winnerReserveEth") : Promise.resolve(0n),
    currentRoundId === 0n ? readContract(client, "nextTreasuryRewardBudget") : Promise.resolve([0n, 0n] as const),
  ]);
  const [treasuryBudgetRoundId, treasuryBudget] = treasuryBudgetRaw as readonly [bigint, bigint];
  const genesisTreasuryBudget = treasuryBudgetRoundId === targetRoundId ? treasuryBudget : 0n;
  return {
    chainNow: block.timestamp,
    currentRoundId,
    currentRound: roundRaw as BurntatoRound | null,
    protocolConfig: configRaw as RoundConfig,
    currentEmission: emissionRaw as readonly [bigint, bigint],
    purchasesPaused: (pausedRaw as boolean) || !(purchasesInitializedRaw as boolean),
    commitmentsPaused: pausedRaw as boolean,
    potatoBalance: balanceRaw as bigint,
    targetRoundId,
    ownCommitment: ownRaw as bigint,
    totalCommitment: totalRaw as bigint,
    activeRecoveryCommitment: activeOwnRaw as bigint,
    activeRecoveryTotalCommitment: activeTotalRaw as bigint,
    genesisWinnerReserve: winnerReserveRaw as bigint,
    genesisTreasuryBudget,
  };
}

async function validateRewards(client: PublicClient, events: BurntatoEvent[], account: Address): Promise<RewardCandidate[]> {
  const roundIds = candidateRoundIds(events, account);
  const rewards: RewardCandidate[] = [];
  await Promise.all(roundIds.map(async (roundId) => {
    const [roundRaw, winnerClaimedRaw, recoveryClaimedRaw, recoveryAmountRaw] = await Promise.all([
      readContract(client, "getRound", [roundId]),
      readContract(client, "winnerClaimed", [roundId]),
      readContract(client, "recoveryClaimed", [roundId, account]),
      readContract(client, "claimableRecovery", [roundId, account]),
    ]);
    const round = roundRaw as unknown as BurntatoRound;
    const isWinner = round.settled && round.currentHolder.toLowerCase() === account.toLowerCase();
    if (isWinner) rewards.push({ id: `winner-${roundId}`, kind: "winner", roundId, amount: round.winnerPool, claimed: winnerClaimedRaw as boolean });
    const committed = events.some((event) => event.name === "RecoveryCommitted" && event.args.roundId === roundId && String(event.args.account).toLowerCase() === account.toLowerCase());
    if (committed && round.settled) rewards.push({ id: `recovery-${roundId}`, kind: "recovery", roundId, amount: recoveryAmountRaw as bigint, claimed: recoveryClaimedRaw as boolean });
  }));
  return rewards.sort((a, b) => a.roundId > b.roundId ? -1 : 1);
}

export function BurntatoBridge({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const wallet = useWalletState();
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BURNTATO_DEPLOYMENT.chainId });
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const historyCacheKey = useMemo(() => ["burntato-history", BURNTATO_DEPLOYMENT.chainId, BURNTATO_DEPLOYMENT.diamond, BURNTATO_DEPLOYMENT.sourceCommit] as const, []);
  const initialHistoryCache = useMemo(() => queryClient.getQueryData<{ events: BurntatoEvent[]; lastScannedBlock: bigint }>(historyCacheKey) ?? {
    events: [],
    lastScannedBlock: BURNTATO_DEPLOYMENT.deploymentBlock - 1n,
  }, [historyCacheKey, queryClient]);
  const historyCacheRef = useRef(initialHistoryCache);
  const [history, setHistory] = useState<BurntatoEvent[]>(initialHistoryCache.events);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardCandidate[]>([]);
  const [transactions, setTransactions] = useState<Transactions>({});
  const [latestTransaction, setLatestTransaction] = useState<TransactionState | null>(null);
  const inFlightActionsRef = useRef(new Set<TransactionAction>());
  const scanToRef = useRef(initialHistoryCache.lastScannedBlock);
  const scanningRef = useRef(false);
  const refreshRequestRef = useRef(0);
  const account = wallet.activeAddress as Address | null;

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const requestId = ++refreshRequestRef.current;
    try {
      const next = await readSnapshot(publicClient as PublicClient, account ?? undefined);
      if (requestId !== refreshRequestRef.current) return;
      setSnapshot(next);
      setReadError(null);
    } catch {
      if (requestId !== refreshRequestRef.current) return;
      setReadError("The game is temporarily unavailable. Try again shortly.");
    } finally {
      if (requestId === refreshRequestRef.current) setLoading(false);
    }
  }, [account, publicClient]);

  const scanHistory = useCallback(async () => {
    if (!publicClient || scanningRef.current) return;
    scanningRef.current = true;
    try {
      const latest = await publicClient.getBlockNumber();
      const indexerUrl = process.env.NEXT_PUBLIC_BURNTATO_INDEXER_URL?.trim();
      if (indexerUrl) {
        try {
          const indexed = await fetchIndexedHistory(indexerUrl, BURNTATO_DEPLOYMENT.deploymentBlock);
          historyCacheRef.current = { events: indexed.events, lastScannedBlock: indexed.indexedBlock ?? BURNTATO_DEPLOYMENT.deploymentBlock - 1n };
          setHistory(indexed.events);
          setHistoryError(null);
          return;
        } catch {
          // The direct event scan below is the user-transparent fallback.
        }
      }
      const from = scanToRef.current + 1n;
      if (from <= latest) {
        const next = await scanBurntatoEvents(publicClient as PublicClient, from, latest);
        const merged = dedupeEvents([...historyCacheRef.current.events, ...next]);
        historyCacheRef.current = { events: merged, lastScannedBlock: latest };
        setHistory(merged);
        queryClient.setQueryData(historyCacheKey, historyCacheRef.current);
        scanToRef.current = latest;
      }
      setHistoryError(null);
    } catch {
      setHistoryError("Leaderboard and reward history are temporarily unavailable. Try again shortly.");
    } finally {
      scanningRef.current = false;
      setHistoryLoading(false);
    }
  }, [historyCacheKey, publicClient, queryClient]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 3_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const initial = window.setTimeout(() => void scanHistory(), 0);
    const interval = window.setInterval(() => void scanHistory(), 12_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [scanHistory]);

  useEffect(() => {
    if (!publicClient || !account) return;
    let cancelled = false;
    void validateRewards(publicClient as PublicClient, history, account)
      .then((next) => { if (!cancelled) setRewards(next); })
      .catch(() => { if (!cancelled) setHistoryError("Rewards could not be updated. Try again shortly."); });
    return () => { cancelled = true; };
  }, [account, history, publicClient, snapshot.currentRoundId]);

  const runTransaction = useCallback(async (action: TransactionAction, request: { functionName: string; args?: readonly unknown[]; value?: bigint }) => {
    if (!publicClient || !account) return;
    if (!canStartTransaction(action, inFlightActionsRef.current)) return;
    inFlightActionsRef.current.add(action);
    const walletState: TransactionState = { stage: "wallet", message: "Confirm in your wallet…" };
    setTransactions((current) => ({ ...current, [action]: walletState }));
    setLatestTransaction(walletState);
    try {
      const simulation = await publicClient.simulateContract({
        ...contractRequest(request.functionName, request.args),
        account,
        value: request.value,
      } as never);
      const hash = await writeContractAsync(simulation.request as never);
      const confirmingState: TransactionState = { stage: "confirming", message: `Confirming on ${BURNTATO_DEPLOYMENT.network}…`, hash };
      setTransactions((current) => ({ ...current, [action]: confirmingState }));
      setLatestTransaction(confirmingState);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      const successState: TransactionState = { stage: "success", message: `Confirmed on ${BURNTATO_DEPLOYMENT.network}.`, hash };
      setTransactions((current) => ({ ...current, [action]: successState }));
      setLatestTransaction(successState);
      await refresh();
      await scanHistory();
    } catch (error) {
      const errorState: TransactionState = { stage: "error", message: describeBurntatoError(error) };
      setTransactions((current) => ({ ...current, [action]: errorState }));
      setLatestTransaction(errorState);
      await refresh();
    } finally {
      inFlightActionsRef.current.delete(action);
    }
  }, [account, publicClient, refresh, scanHistory, writeContractAsync]);

  const switchToRobinhood = useCallback(() => {
    if (!canStartTransaction("network", inFlightActionsRef.current)) return;
    inFlightActionsRef.current.add("network");
    const switchingState: TransactionState = { stage: "wallet", message: `Approve the ${BURNTATO_DEPLOYMENT.network} network switch…` };
    setTransactions((current) => ({ ...current, network: switchingState }));
    setLatestTransaction(switchingState);
    void switchChainAsync({ chainId: BURNTATO_DEPLOYMENT.chainId })
      .then(() => {
        const successState: TransactionState = { stage: "success", message: `Connected to ${BURNTATO_DEPLOYMENT.network}.` };
        setTransactions((current) => ({ ...current, network: successState }));
        setLatestTransaction(successState);
      })
      .catch((error) => {
        const errorState: TransactionState = { stage: "error", message: describeBurntatoError(error) };
        setTransactions((current) => ({ ...current, network: errorState }));
        setLatestTransaction(errorState);
      })
      .finally(() => inFlightActionsRef.current.delete("network"));
  }, [switchChainAsync]);

  const leaderboard = useMemo(() => buildLeaderboard(history, snapshot.currentRoundId), [history, snapshot.currentRoundId]);
  const lifetimeClaimed = useMemo(() => history.reduce((total, event) => {
    if ((event.name !== "WinnerClaimed" && event.name !== "RecoveryClaimed") || !account) return total;
    return String(event.args.account ?? event.args.winner).toLowerCase() === account.toLowerCase() ? total + (event.args.amount as bigint) : total;
  }, 0n), [account, history]);
  const gameplayTransactionPending = hasGameplayTransactionPending(transactions);
  const networkSwitchBlocked = hasAnyTransactionPending(transactions);

  const value = useMemo<BurntatoState>(() => ({
    configured: true,
    chainId,
    correctNetwork: chainId === BURNTATO_DEPLOYMENT.chainId,
    ...snapshot,
    phase: deriveRoundPhase(snapshot.currentRound, snapshot.chainNow),
    loading,
    readError,
    history,
    historyLoading,
    historyError,
    leaderboard,
    rewards: account ? rewards : [],
    lifetimeClaimed,
    transactions,
    latestTransaction,
    gameplayTransactionPending,
    networkSwitchBlocked,
    switchToRobinhood,
    refresh,
    grab: () => runTransaction("grab", { functionName: "buyPotato", value: snapshot.currentRound?.nextPrice ?? snapshot.protocolConfig?.startingPrice ?? 0n }),
    settle: () => runTransaction("settle", { functionName: "settleRound" }),
    collect: () => runTransaction("collect", { functionName: "materializeMaturedEmission" }),
    commit: (amount) => runTransaction("commit", { functionName: "commitRecovery", args: [amount] }),
    claim: (reward) => runTransaction(`${reward.kind}-${reward.roundId}`, { functionName: reward.kind === "winner" ? "claimWinner" : "claimRecovery", args: [reward.roundId, account] }),
    dismissTransactionNotice: () => setLatestTransaction(null),
  }), [account, chainId, gameplayTransactionPending, history, historyError, historyLoading, latestTransaction, leaderboard, lifetimeClaimed, loading, networkSwitchBlocked, readError, refresh, rewards, runTransaction, snapshot, switchToRobinhood, transactions]);

  return <BurntatoContext.Provider value={value}>{children}</BurntatoContext.Provider>;
}

export function useBurntatoState(): BurntatoState {
  return useContext(BurntatoContext);
}

export { BurntatoContext };
export type { TransactionAction, TransactionState } from "@/lib/burntato/transactions";
