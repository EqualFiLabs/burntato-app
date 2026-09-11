import { describe, expect, it } from "vitest";

import {
  ZERO_ADDRESS,
  activationUpgradeCost,
  describeOperatorError,
  faucetEligibility,
  operatorClaimBatch,
  operatorPreviewFromResult,
  operatorRewardAction,
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

  it("derives faucet readiness and each receipt-bound reward action", () => {
    expect(faucetEligibility(100n, 100n, 200n, 200n)).toEqual({ ready: true, funded: true });
    expect(faucetEligibility(99n, 100n, 199n, 200n)).toEqual({ ready: false, funded: false });
    expect(operatorRewardAction(account, { ...registration, owner: ZERO_ADDRESS }, preview)).toBe("register");
    expect(operatorRewardAction(account, registration, { ...preview, currentWeight: 12_500 })).toBe("sync");
    expect(operatorRewardAction(account, registration, preview)).toBe("claim");
  });

  it("forces re-registration after owner or weight invalidation", () => {
    expect(operatorRewardAction(account, registration, { ...preview, currentOwner: "0x2222222222222222222222222222222222222222", transferDetected: true, forfeitable: 5n })).toBe("register");
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

  it("builds a sorted batch from currently owned valid registrations", () => {
    const other = "0x2222222222222222222222222222222222222222" as const;
    const rewards = [
      { operatorId: 9n, registration, preview: { ...preview, claimable: 3n } },
      { operatorId: 2n, registration, preview: { ...preview, claimable: 5n } },
      { operatorId: 4n, registration: { ...registration, owner: ZERO_ADDRESS }, preview },
      { operatorId: 6n, registration, preview: { ...preview, currentOwner: other, transferDetected: true } },
    ];

    expect(operatorClaimBatch(account, rewards)).toEqual({ operatorIds: [2n, 9n], claimable: 8n });
    expect(operatorClaimBatch(null, rewards)).toEqual({ operatorIds: [], claimable: 0n });
  });
});
