import { describe, expect, it } from "vitest";

import {
  ZERO_ADDRESS,
  activationUpgradeCost,
  describeOperatorError,
  faucetEligibility,
  formatOperatorRewardShare,
  operatorActionBatches,
  operatorPreviewFromResult,
  parseOperatorId,
} from "./model";

const account = "0x1111111111111111111111111111111111111111" as const;
const registration = { owner: account, weight: 10_000, rewardIndex: 0n, claimable: 0n, rewardRemainder: 0n };
const preview = { currentOwner: account, currentWeight: 10_000, transferDetected: false, claimable: 0n, forfeitable: 0n, rewardRemainder: 0n };

describe("Operator onboarding state", () => {
  it("accepts only deployed Operator token IDs", () => {
    expect(parseOperatorId("1")).toBe(1n);
    expect(parseOperatorId("5555")).toBe(5_555n);
    expect(parseOperatorId("0")).toBeNull();
    expect(parseOperatorId("5556")).toBeNull();
    expect(parseOperatorId("1.5")).toBeNull();
  });

  it("adds each intermediate tier cost", () => {
    expect(activationUpgradeCost([10n, 20n, 30n, 40n], 0, 3)).toBe(60n);
    expect(activationUpgradeCost([10n, 20n, 30n, 40n], 2, 4)).toBe(70n);
    expect(activationUpgradeCost([10n, 20n, 30n, 40n], 3, 2)).toBe(0n);
  });

  it("turns faucet and ownership failures into specific guidance", () => {
    expect(describeOperatorError(new Error("FaucetUnderfunded(0, 1)"))).toContain("faucet");
    expect(describeOperatorError(new Error("InvalidOperatorOwner(1, a, b)"))).toContain("not the current owner");
  });

  it("derives faucet readiness", () => {
    expect(faucetEligibility(100n, 100n, 200n, 200n)).toEqual({ ready: true, funded: true });
    expect(faucetEligibility(99n, 100n, 199n, 200n)).toEqual({ ready: false, funded: false });
  });

  it("formats activation-weighted wallet reward share", () => {
    expect(formatOperatorRewardShare(0n, 0n)).toBe("0%");
    expect(formatOperatorRewardShare(25_000n, 100_000n)).toBe("25%");
    expect(formatOperatorRewardShare(12_500n, 30_000n)).toBe("41.66%");
    expect(formatOperatorRewardShare(1n, 20_000n)).toBe("<0.01%");
    expect(formatOperatorRewardShare(125_000n, 100_000n)).toBe("100%");
  });

  it("maps the positional rewards contract result to named UI fields", () => {
    expect(operatorPreviewFromResult([account, 10_000, true, 4n, 5n, 6n])).toEqual({
      currentOwner: account,
      currentWeight: 10_000,
      transferDetected: true,
      claimable: 4n,
      forfeitable: 5n,
      rewardRemainder: 6n,
    });
  });

  it("classifies sorted owned Operators for every batch action", () => {
    const other = "0x2222222222222222222222222222222222222222" as const;
    const rewards = [
      { operatorId: 9n, registration, preview: { ...preview, claimable: 3n } },
      { operatorId: 2n, registration, preview: { ...preview, currentWeight: 12_500, claimable: 5n } },
      { operatorId: 4n, registration: { ...registration, owner: ZERO_ADDRESS }, preview },
      { operatorId: 6n, registration, preview: { ...preview, currentOwner: other, transferDetected: true } },
      { operatorId: 7n, registration: { ...registration, owner: other }, preview: { ...preview, transferDetected: true } },
      { operatorId: 9n, registration, preview: { ...preview, claimable: 3n } },
    ];

    expect(operatorActionBatches(account, rewards)).toEqual({
      registerOperatorIds: [4n, 7n],
      syncOperatorIds: [2n],
      claimOperatorIds: [2n, 9n],
      claimable: 8n,
      registeredWeight: 20_000n,
    });
    expect(operatorActionBatches(null, rewards)).toEqual({
      registerOperatorIds: [],
      syncOperatorIds: [],
      claimOperatorIds: [],
      claimable: 0n,
      registeredWeight: 0n,
    });
  });
});
