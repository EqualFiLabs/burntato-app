import { describe, expect, it } from "vitest";
import type { Address, PublicClient } from "viem";

import { discoverOwnedOperatorIds } from "./ownership";

const account = "0x1111111111111111111111111111111111111111" as Address;
const other = "0x2222222222222222222222222222222222222222" as Address;

describe("Operator ownership discovery", () => {
  it("deduplicates incoming transfers and verifies current ownership", async () => {
    const client = {
      getBlockNumber: async () => 112_400_000n,
      getLogs: async () => [
        { args: { tokenId: 12n } },
        { args: { tokenId: 3n } },
        { args: { tokenId: 12n } },
        { args: { tokenId: 8n } },
      ],
      readContract: async ({ args }: { args: readonly [bigint] }) => args[0] === 8n ? other : account,
    } as unknown as PublicClient;

    await expect(discoverOwnedOperatorIds(client, account)).resolves.toEqual([3n, 12n]);
  });

  it("returns an empty dropdown when the wallet has no incoming Operators", async () => {
    const client = {
      getBlockNumber: async () => 112_400_000n,
      getLogs: async () => [],
      readContract: async () => account,
    } as unknown as PublicClient;

    await expect(discoverOwnedOperatorIds(client, account)).resolves.toEqual([]);
  });
});
