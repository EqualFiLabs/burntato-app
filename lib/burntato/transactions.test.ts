import { describe, expect, it } from "vitest";

import {
  canStartTransaction,
  hasAnyTransactionPending,
  hasGameplayTransactionPending,
  hasNetworkTransactionPending,
  isTransactionPending,
  type Transactions,
} from "./transactions";

describe("transaction dependencies", () => {
  it("treats wallet and confirmation stages as pending", () => {
    expect(isTransactionPending({ stage: "wallet", message: "Confirm" })).toBe(true);
    expect(isTransactionPending({ stage: "confirming", message: "Waiting" })).toBe(true);
    expect(isTransactionPending({ stage: "success", message: "Done" })).toBe(false);
    expect(isTransactionPending({ stage: "error", message: "Failed" })).toBe(false);
  });

  it("serializes active-round mutations", () => {
    const transactions: Transactions = {
      collect: { stage: "confirming", message: "Waiting" },
    };

    expect(hasGameplayTransactionPending(transactions)).toBe(true);
    expect(hasNetworkTransactionPending(transactions)).toBe(false);
  });

  it("does not let an independent reward claim lock gameplay", () => {
    const transactions: Transactions = {
      "winner-4": { stage: "confirming", message: "Waiting" },
    };

    expect(hasGameplayTransactionPending(transactions)).toBe(false);
    expect(hasNetworkTransactionPending(transactions)).toBe(false);
    expect(hasAnyTransactionPending(transactions)).toBe(true);
  });

  it("allows independent claims but prevents duplicate claims", () => {
    const inFlight = new Set(["winner-4"] as const);

    expect(canStartTransaction("recovery-4", inFlight)).toBe(true);
    expect(canStartTransaction("winner-4", inFlight)).toBe(false);
    expect(canStartTransaction("network", inFlight)).toBe(false);
  });

  it("keeps gameplay mutations serialized", () => {
    const inFlight = new Set(["grab"] as const);

    expect(canStartTransaction("collect", inFlight)).toBe(false);
    expect(canStartTransaction("winner-4", inFlight)).toBe(true);
  });

  it("serializes future sponsorship with active-round changes", () => {
    const sponsorInFlight = new Set(["sponsor-10"] as const);
    expect(canStartTransaction("settle", sponsorInFlight)).toBe(false);
    expect(canStartTransaction("sponsor-11", sponsorInFlight)).toBe(false);
    expect(hasGameplayTransactionPending({
      "sponsor-10": { stage: "confirming", message: "Waiting" },
    })).toBe(true);
  });

  it("tracks the network switch separately", () => {
    const transactions: Transactions = {
      network: { stage: "wallet", message: "Switch" },
    };

    expect(hasNetworkTransactionPending(transactions)).toBe(true);
    expect(hasGameplayTransactionPending(transactions)).toBe(false);
  });
});
