import { describe, expect, it } from "vitest";

import { activationUpgradeCost, describeOperatorError, parseOperatorId } from "./model";

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
});
