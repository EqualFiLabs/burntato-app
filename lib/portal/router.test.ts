import { describe, expect, it } from "vitest";
import { decodeAbiParameters, parseAbiParameters, zeroAddress } from "viem";

import { buildSwapPlan, describeSwapError, minimumOutput, quoteIsFresh, routerCommands, transactionDeadline, type PoolKey } from "./router";

const key: PoolKey = {
  currency0: zeroAddress,
  currency1: "0x1111111111111111111111111111111111111111",
  fee: 8_388_608,
  tickSpacing: 60,
  hooks: "0x2222222222222222222222222222222222222222",
};

describe("Robinhood V4 exact-input routing", () => {
  it("uses the qualified command sequence for buys and Permit2 sells", () => {
    expect(routerCommands("buy")).toBe("0x10");
    expect(routerCommands("sell")).toBe("0x8a10");
  });

  it("encodes swap, settle-all, and take-all in order", () => {
    const plan = buildSwapPlan(key, "buy", 1_000n, 900n);
    const [actions, params] = decodeAbiParameters(parseAbiParameters("bytes actions,bytes[] params"), plan);
    expect(actions).toBe("0x060c0f");
    expect(params).toHaveLength(3);
  });

  it("derives a bounded minimum output", () => {
    expect(minimumOutput(1_000n, 100)).toBe(990n);
    expect(() => minimumOutput(1_000n, 0)).toThrow();
    expect(() => minimumOutput(1_000n, 5_001)).toThrow();
  });

  it("rejects stale quotes and bounds transaction deadlines", () => {
    expect(quoteIsFresh(1_000n, 1_120n)).toBe(true);
    expect(quoteIsFresh(1_000n, 1_121n)).toBe(false);
    expect(quoteIsFresh(1_000n, 999n)).toBe(false);
    expect(transactionDeadline(1_000n)).toBe(1_300n);
    expect(() => transactionDeadline(1_000n, 3_601n)).toThrow();
  });

  it("explains the POTATO approval rule without exposing routing internals", () => {
    expect(describeSwapError(new Error("Permit2AllowanceIsFixedAtInfinity()"))).toBe("POTATO needs a one-time approval before it can be swapped.");
  });
});
