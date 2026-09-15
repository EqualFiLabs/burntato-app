import { describe, expect, it } from "vitest";

import {
  clampAmount,
  countdownSeconds,
  currentWinnerPot,
  deriveRoundPhase,
  describeBurntatoError,
  formatCountdown,
  formatEth,
  formatRecoveryWithdrawalCountdown,
  projectGrabPrices,
  projectedRecoveryPayout,
  protocolStateNotice,
  recoveryPositionShareBps,
  remainingRoundEmissions,
  shareBps,
  type BurntatoRound,
} from "./model";

function round(overrides: Partial<BurntatoRound> = {}): BurntatoRound {
  return {
    roundId: 1n,
    config: {
      startingPrice: 1n,
      priceIncreaseBps: 100,
      roundTimeout: 100n,
      roundEmissionBudget: 0n,
      emissionStepBps: 0,
      emissionVestingDuration: 100n,
      winnerBps: 0,
      nextRoundWinnerBps: 0,
      recoveryBps: 0,
      treasuryBps: 0,
      recoveryBurnBps: 0,
      recoveryTreasuryBps: 0,
      buybackBps: 0,
      operatorPurchaseBps: 0,
      roundTimeoutDecay: 0n,
      minimumRoundTimeout: 0n,
    },
    currentHolder: "0x1111111111111111111111111111111111111111",
    holderSince: 1n,
    deadline: 100n,
    purchaseIndex: 1n,
    nextPrice: 1n,
    holderMaxReward: 0n,
    holderEarned: 0n,
    remainingEmission: 0n,
    emittedPotato: 0n,
    treasuryEmissionBudget: 0n,
    holderTreasuryMaxReward: 0n,
    holderTreasuryEarned: 0n,
    remainingTreasuryEmission: 0n,
    treasuryEmittedPotato: 0n,
    treasuryReleasedPotato: 0n,
    winnerPool: 0n,
    recoveryPool: 0n,
    recoveryCarryIn: 0n,
    totalCommitted: 0n,
    holderEmissionFinalized: false,
    activated: true,
    settled: false,
    ...overrides,
  };
}

describe("round presentation", () => {
  it("distinguishes pre-launch and protocol-pause notices", () => {
    expect(protocolStateNotice(false, false, false)).toBe("Burntato is ready. Gameplay has not been activated yet.");
    expect(protocolStateNotice(true, true, false)).toContain("Trading remains available");
    expect(protocolStateNotice(false, true, false)).toBeNull();
    expect(protocolStateNotice(false, false, true)).toBeNull();
  });
  it("distinguishes unstarted, open, expired, and settled rounds", () => {
    expect(deriveRoundPhase(round({ activated: false }), 1n)).toBe("unstarted");
    expect(deriveRoundPhase(round(), 99n)).toBe("open");
    expect(deriveRoundPhase(round(), 100n)).toBe("expired");
    expect(deriveRoundPhase(round({ settled: true }), 101n)).toBe("settled");
  });

  it("anchors countdowns to the supplied chain time", () => {
    expect(countdownSeconds(3_700n, 1n)).toBe(3_699);
    expect(formatCountdown(3_699)).toBe("01:01:39");
    expect(countdownSeconds(10n, 11n)).toBe(0);
  });

  it("formats long Recovery withdrawal waits without implying second-level precision", () => {
    expect(formatRecoveryWithdrawalCountdown(1_530_000n, 1_000n)).toBe("17d 16h");
    expect(formatRecoveryWithdrawalCountdown(4_700n, 1_000n)).toBe("1h 1m");
    expect(formatRecoveryWithdrawalCountdown(1_001n, 1_000n)).toBe("1m");
    expect(formatRecoveryWithdrawalCountdown(1_000n, 1_000n)).toBe("available now");
  });

  it("preserves low-cost testnet purchase prices", () => {
    expect(formatEth(10_000_000_000_000n)).toBe("0.00001");
  });

  it("shows the pending winner reserve until Round 1 activates", () => {
    expect(currentWinnerPot(null, 3_150_000_000_000_000n)).toBe(3_150_000_000_000_000n);
    expect(currentWinnerPot(round({ winnerPool: 4_000_000_000_000_000n }), 3_150_000_000_000_000n))
      .toBe(4_000_000_000_000_000n);
  });

  it("projects grab prices with the contract's upward BPS rounding", () => {
    expect(projectGrabPrices(10_001n, 5_000)).toEqual([10_001n, 15_002n, 22_503n]);
    expect(projectGrabPrices(1n, 1, 2)).toEqual([1n, 2n]);
  });

  it("separates claimable round emissions from the current holder accrual", () => {
    expect(remainingRoundEmissions(round({ remainingEmission: 100n, remainingTreasuryEmission: 50n }), [30n, 20n])).toEqual({
      baseAvailable: 70n,
      treasuryAvailable: 30n,
      totalAvailable: 100n,
      holderAccrued: 50n,
      holderAccruedFinalized: false,
    });
  });

  it("does not subtract already-finalized holder emission twice", () => {
    expect(remainingRoundEmissions(round({
      remainingEmission: 70n,
      remainingTreasuryEmission: 30n,
      holderEmissionFinalized: true,
    }), [30n, 20n])).toEqual({
      baseAvailable: 70n,
      treasuryAvailable: 30n,
      totalAvailable: 100n,
      holderAccrued: 50n,
      holderAccruedFinalized: true,
    });
  });
});

describe("commitment controls", () => {
  it("clamps bigint token amounts and calculates prospective share", () => {
    expect(clampAmount(-1n, 100n)).toBe(0n);
    expect(clampAmount(120n, 100n)).toBe(100n);
    expect(shareBps(25n, 75n)).toBe(2_500n);
  });

  it("projects live recovery positions with settlement-compatible floor rounding", () => {
    expect(recoveryPositionShareBps(8_000n, 128_400n)).toBe(623n);
    expect(projectedRecoveryPayout(675n, 8_000n, 128_400n)).toBe(42n);
  });

  it("returns zero for incomplete recovery position state", () => {
    expect(recoveryPositionShareBps(8_000n, 0n)).toBe(0n);
    expect(projectedRecoveryPayout(675n, 8_000n, 0n)).toBe(0n);
    expect(projectedRecoveryPayout(675n, 0n, 128_400n)).toBe(0n);
    expect(projectedRecoveryPayout(0n, 8_000n, 128_400n)).toBe(0n);
  });
});

describe("transaction feedback", () => {
  it("maps known contract and wallet failures to actionable copy", () => {
    expect(describeBurntatoError(new Error("IncorrectPayment(1, 2)"))).toContain("price changed");
    expect(describeBurntatoError(new Error("User rejected the request"))).toContain("cancelled");
    expect(describeBurntatoError(new Error("ProtocolPaused()"))).toContain("paused");
    expect(describeBurntatoError(new Error("PurchasesNotInitialized()"))).toContain("not been initialized");
    expect(describeBurntatoError(new Error("RecoveryWithdrawalTooSoon(123)"))).toContain("not withdrawable yet");
    expect(describeBurntatoError(new Error("RecoveryWithdrawalUnavailable(4)"))).toContain("no longer eligible");
    expect(describeBurntatoError(new Error("NothingToCancel()"))).toContain("no Recovery commitment");
    expect(describeBurntatoError(new Error("InvalidFutureRound(4, 4)"))).toContain("later round");
  });
});
