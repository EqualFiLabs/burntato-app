import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CurrentRoundStats, type CurrentRoundStatsProps } from "../../components/CurrentRoundStats";
import type { BurntatoRound, RoundConfig } from "./model";

const ether = 10n ** 18n;

const config: RoundConfig = {
  startingPrice: 3n * 10n ** 15n,
  priceIncreaseBps: 5_000,
  roundTimeout: 600n,
  roundEmissionBudget: 1_000_000n * ether,
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
};

const activeRound: BurntatoRound = {
  roundId: 4n,
  config,
  currentHolder: "0x1111111111111111111111111111111111111111",
  holderSince: 100n,
  deadline: 700n,
  purchaseIndex: 7n,
  nextPrice: 3n * 10n ** 15n,
  holderMaxReward: 0n,
  holderEarned: 0n,
  remainingEmission: 900_000n * ether,
  emittedPotato: 0n,
  treasuryEmissionBudget: 200_000n * ether,
  holderTreasuryMaxReward: 0n,
  holderTreasuryEarned: 0n,
  remainingTreasuryEmission: 180_000n * ether,
  treasuryEmittedPotato: 0n,
  treasuryReleasedPotato: 0n,
  winnerPool: 2n * ether,
  recoveryPool: ether / 2n,
  recoveryCarryIn: 0n,
  totalCommitted: 0n,
  holderEmissionFinalized: false,
  activated: true,
  settled: false,
};

function render(overrides: Partial<CurrentRoundStatsProps> = {}) {
  return renderToStaticMarkup(createElement(CurrentRoundStats, {
    currentRoundId: 4n,
    round: activeRound,
    protocolConfig: config,
    phase: "open",
    currentEmission: [50_000n * ether, 20_000n * ether],
    recoveryCommitment: 123_000n * ether,
    genesisWinnerReserve: 0n,
    genesisTreasuryBudget: 0n,
    chainNow: 200n,
    ...overrides,
  }));
}

describe("current round stats", () => {
  it("renders only active-round economics and exact projected Grab prices", () => {
    const html = render();

    expect(html).toContain("Round <strong>#4</strong>");
    expect(html).toContain("123,000");
    expect(html).toContain("Grab #8");
    expect(html).toContain("Grab #9");
    expect(html).toContain("Grab #10");
    expect(html).toContain("0.003 ETH");
    expect(html).toContain("0.0045 ETH");
    expect(html).toContain("0.00675 ETH");
    expect(html).toContain("1,010,000");
    expect(html).not.toMatch(/next round/i);
    expect(html).not.toContain("Queued");
  });

  it("treats funded genesis round one as the pending current round", () => {
    const html = render({
      currentRoundId: 0n,
      round: null,
      phase: "unstarted",
      currentEmission: [0n, 0n],
      recoveryCommitment: 0n,
      genesisWinnerReserve: 2n * ether,
      genesisTreasuryBudget: 200_000n * ether,
    });

    expect(html).toContain("Round <strong>#1</strong>");
    expect(html).toContain("2 ETH");
    expect(html).toContain("1,200,000");
    expect(html).toContain("Grab #1");
    expect(html).toContain("Waiting for first Grab");
  });

  it("replaces the ladder with settlement guidance after expiry", () => {
    const html = render({ phase: "expired" });

    expect(html).toContain("Purchases are closed");
    expect(html).toContain("Settle this round from Play");
    expect(html).not.toContain("Grab #8");
  });
});
