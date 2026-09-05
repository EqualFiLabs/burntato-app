import { describe, expect, it } from "vitest";

import { buildLeaderboard, candidateRoundIds, dedupeEvents, fetchIndexedHistory, type BurntatoEvent } from "./history";

const alice = "0x1111111111111111111111111111111111111111";
const bob = "0x2222222222222222222222222222222222222222";

function event(name: BurntatoEvent["name"], logIndex: number, args: Record<string, unknown>): BurntatoEvent {
  return { name, logIndex, args, blockNumber: 100n + BigInt(logIndex), transactionHash: `0x${String(logIndex).padStart(64, "0")}` as `0x${string}` };
}

describe("event projection", () => {
  it("deduplicates retried scan ranges", () => {
    const purchase = event("PotatoPurchased", 1, { roundId: 1n, buyer: alice });
    expect(dedupeEvents([purchase, purchase])).toHaveLength(1);
  });

  it("does not double-count hold time for treasury emissions", () => {
    const rows = buildLeaderboard([
      event("EmissionFinalized", 1, { roundId: 2n, holder: alice, earned: 10n, heldSeconds: 50n }),
      event("TreasuryRewardFinalized", 2, { roundId: 2n, holder: alice, earned: 5n, heldSeconds: 50n }),
    ], 2n);
    expect(rows[0]).toMatchObject({ earned: 15n, roundEarned: 15n, hold: 50n, roundHold: 50n });
  });

  it("reconstructs recovery entitlement from commitments and settlement", () => {
    const rows = buildLeaderboard([
      event("RecoveryCommitted", 1, { roundId: 3n, account: alice, amount: 25n }),
      event("RecoveryCommitted", 2, { roundId: 3n, account: bob, amount: 75n }),
      event("RoundSettled", 3, { roundId: 3n, winner: bob, recoveryPool: 40n, totalCommitted: 100n }),
    ], 3n);
    expect(rows.find((row) => row.address === alice)?.recovery).toBe(10n);
    expect(rows.find((row) => row.address === bob)).toMatchObject({ recovery: 30n, wins: 1 });
  });

  it("discovers candidate reward rounds from winner and commitment activity", () => {
    const rounds = candidateRoundIds([
      event("RecoveryCommitted", 1, { roundId: 4n, account: alice, amount: 10n }),
      event("RoundSettled", 2, { roundId: 5n, winner: alice }),
    ], alice);
    expect(rounds).toEqual([5n, 4n]);
  });
});

describe("durable indexer projection", () => {
  it("validates the deployment and revives integer event arguments", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input) => new Response(JSON.stringify(String(input).endsWith("/status")
      ? { robinhoodTestnet: { id: 46_630, block: { number: 112_339_500 } } }
      : {
          chainId: 46_630,
          deployment: "robinhood-testnet-46630-low-cost",
          items: [{
            source: "burntato",
            name: "RecoveryCommitted",
            transactionHash: `0x${"1".repeat(64)}`,
            logIndex: 2,
            blockNumber: "112339450",
            args: { roundId: "2", account: alice, amount: "100" },
          }],
        }));
    try {
      const result = await fetchIndexedHistory("https://indexer.example/", 112_339_401n);
      expect(result.indexedBlock).toBe(112_339_500n);
      expect(result.events[0]?.args).toMatchObject({ roundId: 2n, amount: 100n });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("paginates with a stable event cursor and deduplicates retries", async () => {
    const previousFetch = globalThis.fetch;
    let eventsPage = 0;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/status")) return new Response(JSON.stringify({ robinhoodTestnet: { id: 46_630, block: { number: 112_340_000 } } }));
      eventsPage += 1;
      const base = { source: "burntato", name: "RecoveryCommitted", transactionHash: `0x${"2".repeat(64)}`, logIndex: 1, blockNumber: "112339500", args: { roundId: "2", account: alice, amount: "100" } };
      if (eventsPage === 1) return new Response(JSON.stringify({ chainId: 46_630, deployment: "robinhood-testnet-46630-low-cost", nextCursor: { blockNumber: "112339500", logIndex: 1 }, items: [base] }));
      expect(url.searchParams.get("afterBlock")).toBe("112339500");
      expect(url.searchParams.get("afterLogIndex")).toBe("1");
      return new Response(JSON.stringify({ chainId: 46_630, deployment: "robinhood-testnet-46630-low-cost", nextCursor: null, items: [base] }));
    };
    try {
      const result = await fetchIndexedHistory("https://indexer.example", 112_339_401n);
      expect(result.events).toHaveLength(1);
      expect(eventsPage).toBe(2);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("rejects an indexer serving the superseded Burntato deployment", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input) => new Response(JSON.stringify(String(input).endsWith("/status")
      ? { robinhoodTestnet: { id: 46_630, block: { number: 113_055_900 } } }
      : { chainId: 46_630, deployment: "robinhood-testnet-46630", nextCursor: null, items: [] }));
    try {
      await expect(fetchIndexedHistory("https://indexer.example", 113_055_786n)).rejects.toThrow("Indexer deployment mismatch");
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
