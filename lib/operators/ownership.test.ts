import { describe, expect, it } from "vitest";
import type { Address, PublicClient } from "viem";

import { discoverOwnedOperatorIds } from "./ownership";

const account = "0x1111111111111111111111111111111111111111" as Address;
const other = "0x2222222222222222222222222222222222222222" as Address;

describe("Operator ownership discovery", () => {
  it("deduplicates incoming transfers and verifies current ownership", async () => {
    let multicallCount = 0;
    const client = {
      getBlockNumber: async () => 112_400_000n,
      getLogs: async () => [
        { args: { tokenId: 12n } },
        { args: { tokenId: 3n } },
        { args: { tokenId: 12n } },
        { args: { tokenId: 8n } },
      ],
      multicall: async ({
        contracts,
      }: {
        contracts: readonly { args: readonly [bigint] }[];
      }) => {
        multicallCount += 1;
        return contracts.map(({ args }) => ({
          status: "success",
          result: args[0] === 8n ? other : account,
        }));
      },
    } as unknown as PublicClient;

    await expect(discoverOwnedOperatorIds(client, account)).resolves.toEqual([
      3n,
      12n,
    ]);
    expect(multicallCount).toBe(1);
  });

  it("returns an empty set when the wallet has no incoming Operators", async () => {
    const client = {
      getBlockNumber: async () => 112_400_000n,
      getLogs: async () => [],
      multicall: async () => {
        throw new Error("multicall should not run without candidates");
      },
    } as unknown as PublicClient;

    await expect(discoverOwnedOperatorIds(client, account)).resolves.toEqual(
      [],
    );
  });
});
