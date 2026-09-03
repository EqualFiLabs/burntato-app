import { describe, expect, it } from "vitest";

import { buildLeaderboard, candidateRoundIds, dedupeEvents, type BurntatoEvent } from "./history";

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
