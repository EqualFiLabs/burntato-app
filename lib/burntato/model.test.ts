import { describe, expect, it } from "vitest";

import { clampAmount, countdownSeconds, deriveRoundPhase, describeBurntatoError, formatCountdown, formatEth, shareBps, type BurntatoRound } from "./model";

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

  it("preserves low-cost testnet purchase prices", () => {
    expect(formatEth(10_000_000_000_000n, 8)).toBe("0.00001");
  });
});

describe("commitment controls", () => {
  it("clamps bigint token amounts and calculates prospective share", () => {
    expect(clampAmount(-1n, 100n)).toBe(0n);
    expect(clampAmount(120n, 100n)).toBe(100n);
    expect(shareBps(25n, 75n)).toBe(2_500n);
  });
});

describe("transaction feedback", () => {
  it("maps known contract and wallet failures to actionable copy", () => {
    expect(describeBurntatoError(new Error("IncorrectPayment(1, 2)"))).toContain("price changed");
    expect(describeBurntatoError(new Error("User rejected the request"))).toContain("cancelled");
    expect(describeBurntatoError(new Error("CommitmentsPaused()"))).toContain("paused");
  });
});
