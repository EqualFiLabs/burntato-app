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
    expect(html).toContain("Pool starts at activation");
    expect(html).not.toContain("Est. recovery");
  });

  it("handles empty and zero-total states safely", () => {
    expect(render()).toContain("No recovery positions");
    const html = render({ activeCommitment: 1n * unit, activeTotalCommitment: 0n, currentRecoveryPool: 0n });
    expect(html).toContain("0.00%");
    expect(html).toContain("0 ETH");
  });
});
