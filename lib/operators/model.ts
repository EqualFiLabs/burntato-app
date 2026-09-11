import type { Address } from "viem";

import { BURNTATO_DEPLOYMENT } from "../burntato/contract";

export const MAX_OPERATOR_ID = 5_555n;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export type PurchaseQuote = {
  staticsPrice: bigint;
  reserveBuyIn: bigint;
  nativeFee: bigint;
  requiredNative: bigint;
  epochActive: boolean;
};

export type OperatorRegistration = {
  owner: Address;
  weight: number;
  rewardIndex: bigint;
  claimable: bigint;
  rewardRemainder: bigint;
};

export type OperatorPreview = {
  currentOwner: Address;
  currentWeight: number;
  transferDetected: boolean;
  claimable: bigint;
  forfeitable: bigint;
  rewardRemainder: bigint;
};

export type OperatorPreviewResult = readonly [Address, number, boolean, bigint, bigint, bigint];

export type OwnedOperatorReward = {
  operatorId: bigint;
  registration: OperatorRegistration;
  preview: OperatorPreview;
};

export type OperatorActionBatches = {
  registerOperatorIds: bigint[];
  syncOperatorIds: bigint[];
  claimOperatorIds: bigint[];
  claimable: bigint;
};

export function operatorPreviewFromResult(result: OperatorPreviewResult): OperatorPreview {
  const [currentOwner, currentWeight, transferDetected, claimable, forfeitable, rewardRemainder] = result;
  return { currentOwner, currentWeight, transferDetected, claimable, forfeitable, rewardRemainder };
}

export function operatorActionBatches(account: Address | null, rewards: readonly OwnedOperatorReward[]): OperatorActionBatches {
  const batches: OperatorActionBatches = {
    registerOperatorIds: [],
    syncOperatorIds: [],
    claimOperatorIds: [],
    claimable: 0n,
  };
  if (!account) return batches;
  const normalizedAccount = account.toLowerCase();
  const seen = new Set<string>();
  const sorted = [...rewards].sort((a, b) => a.operatorId < b.operatorId ? -1 : a.operatorId > b.operatorId ? 1 : 0);
  for (const reward of sorted) {
    const key = reward.operatorId.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    const registeredOwner = reward.registration.owner.toLowerCase();
    const currentOwner = reward.preview.currentOwner.toLowerCase();
    if (registeredOwner === ZERO_ADDRESS.toLowerCase()) {
      batches.registerOperatorIds.push(reward.operatorId);
      continue;
    }
    if (currentOwner !== normalizedAccount) continue;
    if (reward.preview.transferDetected) {
      batches.registerOperatorIds.push(reward.operatorId);
      continue;
    }
    if (registeredOwner !== normalizedAccount) continue;
    if (reward.preview.currentWeight > reward.registration.weight) {
      batches.syncOperatorIds.push(reward.operatorId);
    }
    if (reward.preview.claimable > 0n) {
      batches.claimOperatorIds.push(reward.operatorId);
      batches.claimable += reward.preview.claimable;
    }
  }
  return batches;
}

export type OperatorRewardAction = "register" | "sync" | "claim";

export function operatorRewardAction(account: Address | null, registration: OperatorRegistration, preview: OperatorPreview): OperatorRewardAction {
  const registeredByWallet = Boolean(account && registration.owner.toLowerCase() === account.toLowerCase());
  if (!registeredByWallet || preview.transferDetected) return "register";
  return preview.currentWeight > registration.weight ? "sync" : "claim";
}

export function faucetEligibility(chainNow: bigint, nextClaimAt: bigint, balance: bigint, claimAmount: bigint): { ready: boolean; funded: boolean } {
  return { ready: chainNow >= nextClaimAt, funded: balance >= claimAmount };
}

export function parseOperatorId(value: string): bigint | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const id = BigInt(value.trim());
  return id >= 1n && id <= MAX_OPERATOR_ID ? id : null;
}

export function activationUpgradeCost(tierCosts: readonly bigint[], currentTier: number, targetTier: number): bigint {
  if (targetTier <= currentTier || targetTier > tierCosts.length) return 0n;
  return tierCosts.slice(currentTier, targetTier).reduce((total, cost) => total + cost, 0n);
}

export function describeOperatorError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("rejected") || normalized.includes("denied") || normalized.includes("cancel")) return "The wallet request was cancelled.";
  if (normalized.includes("faucetunderfunded")) return "The testnet faucet does not have enough STATICS for another claim.";
  if (normalized.includes("claimnotready")) return "This wallet is still inside the 24-hour faucet cooldown.";
  if (normalized.includes("genesisnotinvault")) return "That Operator is no longer available in the Genesis Vault.";
  if (normalized.includes("insufficientnative")) return "Your wallet does not have enough testnet ETH for the live purchase fee.";
  if (normalized.includes("erc721nonexistenttoken")) return "That Operator token ID does not exist.";
  if (normalized.includes("permit2allowanceisfixedatinfinity")) return "POTATO requires its Permit2 token approval to use the protocol-defined infinite allowance.";
  if (normalized.includes("insufficient") || normalized.includes("erc20")) return "Your STATICS balance or allowance is too low for this action.";
  if (normalized.includes("notgenesisowner") || normalized.includes("invalidoperatorowner")) return "The active wallet is not the current owner of this Operator.";
  if (normalized.includes("operatoralreadyregistered")) return "This Operator is already registered at its current weight.";
  if (normalized.includes("operatornotregistered")) return "Register this Operator before syncing or claiming.";
  if (normalized.includes("genesisalreadyregistered")) return "This Operator is already registered for Genesis Launch rewards.";
  if (normalized.includes("launchrewardsalreadyfinalized")) return "Genesis Launch rewards have finalized; registration is closed.";
  if (normalized.includes("purchasespaused")) return "Genesis Vault purchases are currently paused.";
  if (normalized.includes("activationtiernotincreased")) return "Choose an activation tier above the current tier.";
  if (normalized.includes("chain") || normalized.includes("network")) return `Switch to ${BURNTATO_DEPLOYMENT.network} and try again.`;
  return "The Operator action could not be completed. Refresh the live state and try again.";
}
