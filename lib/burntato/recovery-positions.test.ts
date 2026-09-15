import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RecoveryPositions } from "../../components/RecoveryPositions";

const unit = 10n ** 18n;

function render(overrides: Partial<Parameters<typeof RecoveryPositions>[0]> = {}) {
  return renderToStaticMarkup(createElement(RecoveryPositions, {
    currentRoundId: 7n,
    currentRecoveryPool: 675n * unit / 100n,
    activeCommitment: 0n,
    activeTotalCommitment: 0n,
    targetRoundId: 8n,
    queuedCommitment: 0n,
    queuedTotalCommitment: 0n,
    chainNow: 1_000n,
    stalledWithdrawalAt: 0n,
    withdrawalPending: false,
    withdrawalError: null,
    withdrawalDisabled: false,
    onWithdraw: () => undefined,
    ...overrides,
  }));
}

describe("recovery positions", () => {
  it("renders a live position with current pool and projected payout", () => {
    const html = render({ activeCommitment: 8_000n * unit, activeTotalCommitment: 128_400n * unit });

    expect(html).toContain("Live");
    expect(html).toContain("Round #7");
    expect(html).toContain("128,400 POTATO total committed");
    expect(html).toContain("6.23%");
    expect(html).toContain("6.75 ETH");
    expect(html).toContain("0.42056075 ETH");
    expect(html).toContain("Pool grows with every Grab");
  });

  it("renders active and queued positions independently", () => {
    const html = render({
      activeCommitment: 8_000n * unit,
      activeTotalCommitment: 128_400n * unit,
      queuedCommitment: 2_000n * unit,
      queuedTotalCommitment: 10_000n * unit,
    });

    expect(html).toContain("Round #7");
    expect(html).toContain("Round #8");
    expect(html).toContain("Queued");
    expect(html).toContain("Across 2 recovery positions");
  });

  it("renders a queued position without a premature recovery estimate", () => {
    const html = render({ queuedCommitment: 2_000n * unit, queuedTotalCommitment: 10_000n * unit });

    expect(html).toContain("Queued");
    expect(html).toContain("Round #8");
    expect(html).toContain("Locked once Round #8 begins");
    expect(html).not.toContain("Est. recovery");
  });

  it("shows the holderless-round countdown and enables withdrawal at maturity", () => {
    const waiting = render({ queuedCommitment: 2_000n * unit, queuedTotalCommitment: 10_000n * unit, stalledWithdrawalAt: 1_530_000n });
    expect(waiting).toContain("Withdrawal available in 17d 16h");
    expect(waiting).not.toContain("Withdraw 2,000 POTATO");

    const available = render({ queuedCommitment: 2_000n * unit, queuedTotalCommitment: 10_000n * unit, chainNow: 1_530_000n, stalledWithdrawalAt: 1_530_000n });
    expect(available).toContain("Holderless-round withdrawal available");
    expect(available).toContain("Withdraw 2,000 POTATO");
  });

  it("renders pending and failed withdrawal states", () => {
    const pending = render({ queuedCommitment: unit, queuedTotalCommitment: unit, chainNow: 2_000n, stalledWithdrawalAt: 1_500n, withdrawalPending: true });
    expect(pending).toContain("Withdrawing…");
    expect(pending).toContain("disabled");

    const failed = render({ queuedCommitment: unit, queuedTotalCommitment: unit, chainNow: 2_000n, stalledWithdrawalAt: 1_500n, withdrawalError: "Try again." });
    expect(failed).toContain("Try again.");
  });

  it("handles empty and zero-total states safely", () => {
    expect(render()).toContain("No recovery positions");
    const html = render({ activeCommitment: 1n * unit, activeTotalCommitment: 0n, currentRecoveryPool: 0n });
    expect(html).toContain("0.00%");
    expect(html).toContain("0 ETH");
  });
});
