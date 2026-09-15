import type { Hash } from "viem";

export type TransactionAction =
  | "network"
  | "grab"
  | "settle"
  | "collect"
  | "commit"
  | `withdraw-recovery-${string}`
  | `sponsor-${string}`
  | `winner-${string}`
  | `recovery-${string}`;

export type TransactionStage = "wallet" | "confirming" | "success" | "error";

export type TransactionState = {
  stage: TransactionStage;
  message: string;
  hash?: Hash;
};

export type Transactions = Partial<Record<TransactionAction, TransactionState>>;

const GAMEPLAY_ACTIONS = ["grab", "settle", "collect", "commit"] as const;

export function isGameplayAction(action: TransactionAction): boolean {
  return action.startsWith("sponsor-") || GAMEPLAY_ACTIONS.some((gameplayAction) => gameplayAction === action);
}

export function isTransactionPending(state: TransactionState | undefined): boolean {
  return state?.stage === "wallet" || state?.stage === "confirming";
}

/**
 * Round-mutating actions share one lock because their simulations depend on
 * current game state. Reward claims are deliberately excluded: each claim is
 * independently keyed by round and does not change the active round.
 */
export function hasGameplayTransactionPending(transactions: Transactions): boolean {
  return Object.entries(transactions).some(([action, state]) =>
    isGameplayAction(action as TransactionAction) && isTransactionPending(state)
  );
}

export function hasNetworkTransactionPending(transactions: Transactions): boolean {
  return isTransactionPending(transactions.network);
}

export function hasAnyTransactionPending(transactions: Transactions): boolean {
  return Object.values(transactions).some(isTransactionPending);
}

/**
 * Network switching depends on every write, gameplay writes depend on other
 * gameplay writes, and a reward claim depends only on itself and the network.
 */
export function canStartTransaction(
  action: TransactionAction,
  inFlightActions: ReadonlySet<TransactionAction>
): boolean {
  if (inFlightActions.has(action) || inFlightActions.has("network")) return false;
  if (action === "network") return inFlightActions.size === 0;
  if (!isGameplayAction(action)) return true;
  return !Array.from(inFlightActions).some(isGameplayAction);
}
