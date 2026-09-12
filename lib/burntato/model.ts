import { formatEther, formatUnits } from "viem";

import { BURNTATO_DEPLOYMENT } from "./contract";

export type RoundConfig = {
  startingPrice: bigint;
  priceIncreaseBps: number;
  roundTimeout: bigint;
  roundEmissionBudget: bigint;
  emissionStepBps: number;
  emissionVestingDuration: bigint;
  winnerBps: number;
  nextRoundWinnerBps: number;
  recoveryBps: number;
  treasuryBps: number;
  recoveryBurnBps: number;
  recoveryTreasuryBps: number;
  buybackBps: number;
  operatorPurchaseBps: number;
  roundTimeoutDecay: bigint;
  minimumRoundTimeout: bigint;
};

export type BurntatoRound = {
  roundId: bigint;
  config: RoundConfig;
  currentHolder: `0x${string}`;
  holderSince: bigint;
  deadline: bigint;
  purchaseIndex: bigint;
  nextPrice: bigint;
  holderMaxReward: bigint;
  holderEarned: bigint;
  remainingEmission: bigint;
  emittedPotato: bigint;
  treasuryEmissionBudget: bigint;
  holderTreasuryMaxReward: bigint;
  holderTreasuryEarned: bigint;
  remainingTreasuryEmission: bigint;
  treasuryEmittedPotato: bigint;
  treasuryReleasedPotato: bigint;
  winnerPool: bigint;
  recoveryPool: bigint;
  recoveryCarryIn: bigint;
  totalCommitted: bigint;
  holderEmissionFinalized: boolean;
  activated: boolean;
  settled: boolean;
};

export type RoundPhase = "unstarted" | "open" | "expired" | "settled";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function deriveRoundPhase(round: BurntatoRound | null, chainNow: bigint): RoundPhase {
  if (!round || !round.activated || round.currentHolder.toLowerCase() === ZERO_ADDRESS) return "unstarted";
  if (round.settled) return "settled";
  return chainNow >= round.deadline ? "expired" : "open";
}

export function countdownSeconds(deadline: bigint, chainNow: bigint): number {
  if (deadline <= chainNow) return 0;
  const remaining = deadline - chainNow;
  return Number(remaining > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : remaining);
}

export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatEth(value: bigint, maximumFractionDigits = 8): string {
  return Number(formatEther(value)).toLocaleString("en-US", { maximumFractionDigits });
}

export function formatPotato(value: bigint, maximumFractionDigits = 2): string {
  return Number(formatUnits(value, 18)).toLocaleString("en-US", { maximumFractionDigits });
}

export function currentWinnerPot(round: BurntatoRound | null, pendingWinnerReserve: bigint): bigint {
  return round?.winnerPool ?? pendingWinnerReserve;
}

export function clampAmount(value: bigint, balance: bigint): bigint {
  return value < 0n ? 0n : value > balance ? balance : value;
}

export function shareBps(amount: bigint, totalBefore: bigint): bigint {
  const total = totalBefore + amount;
  return total === 0n ? 0n : (amount * 10_000n) / total;
}

export function recoveryPositionShareBps(commitment: bigint, totalCommitment: bigint): bigint {
  return commitment === 0n || totalCommitment === 0n ? 0n : (commitment * 10_000n) / totalCommitment;
}

export function projectedRecoveryPayout(recoveryPool: bigint, commitment: bigint, totalCommitment: bigint): bigint {
  return recoveryPool === 0n || commitment === 0n || totalCommitment === 0n
    ? 0n
    : (recoveryPool * commitment) / totalCommitment;
}

export function projectGrabPrices(startingPrice: bigint, priceIncreaseBps: number, count = 3): bigint[] {
  const prices: bigint[] = [];
  let price = startingPrice;
  const increaseBps = BigInt(priceIncreaseBps);

  for (let index = 0; index < count; index += 1) {
    prices.push(price);
    price += (price * increaseBps + 9_999n) / 10_000n;
  }

  return prices;
}

export function remainingRoundEmissions(
  round: BurntatoRound,
  currentEmission: readonly [bigint, bigint],
) {
  const pendingBase = round.holderEmissionFinalized ? 0n : currentEmission[0];
  const pendingTreasury = round.holderEmissionFinalized ? 0n : currentEmission[1];
  const baseAvailable = round.remainingEmission > pendingBase ? round.remainingEmission - pendingBase : 0n;
  const treasuryAvailable = round.remainingTreasuryEmission > pendingTreasury
    ? round.remainingTreasuryEmission - pendingTreasury
    : 0n;

  return {
    baseAvailable,
    treasuryAvailable,
    totalAvailable: baseAvailable + treasuryAvailable,
    holderAccrued: currentEmission[0] + currentEmission[1],
    holderAccruedFinalized: round.holderEmissionFinalized,
  };
}

export function describeBurntatoError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("user rejected") || normalized.includes("user denied") || normalized.includes("cancel")) {
    return "The wallet request was cancelled.";
  }
  if (normalized.includes("incorrectpayment")) return "The price changed before submission. Refresh and try again.";
  if (normalized.includes("invalidfutureround")) return "That round is already active or complete. Choose a later round.";
  if (normalized.includes("roundexpired")) return "This round has expired. Settle it before grabbing again.";
  if (normalized.includes("roundnotexpired")) return "This round is still live.";
  if (normalized.includes("protocolpaused")) return "Burntato is currently paused.";
  if (normalized.includes("purchasesnotinitialized")) return "Burntato purchases have not been initialized.";
  if (normalized.includes("commitmentclosed")) return "Commitments for that round are closed.";
  if (normalized.includes("insufficientbalance")) return "Your POTATO balance is too low.";
  if (normalized.includes("nothingtoclaim")) return "There is nothing claimable for this round.";
  if (normalized.includes("alreadyclaimed")) return "This reward has already been claimed.";
  if (normalized.includes("vestingincomplete")) return "This POTATO emission is still vesting.";
  if (normalized.includes("unauthorizedwinner")) return "Only the round winner can claim this reward.";
  if (normalized.includes("chain") || normalized.includes("network")) return `Switch to ${BURNTATO_DEPLOYMENT.network} and try again.`;
  return "The transaction could not be completed. Refresh the game state and try again.";
}
