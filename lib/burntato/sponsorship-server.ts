import "server-only";

import { cache } from "react";
import { createPublicClient, http } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./contract";
import type { UpcomingRoundFunding } from "./sponsorship";

export const readUpcomingRoundFunding = cache(async (roundId: bigint): Promise<(UpcomingRoundFunding & { currentRoundId: bigint }) | null> => {
  const rpcUrl = process.env.NEXT_PUBLIC_BURNTATO_RPC_URL?.trim()
    ?? process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL?.trim();
  if (!rpcUrl || roundId <= 0n) return null;

  try {
    const url = new URL(rpcUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    const client = createPublicClient({ transport: http(url.toString(), { retryCount: 0, timeout: 4_000 }) });
    const [currentRoundId, funding] = await Promise.all([
      client.readContract({
        address: BURNTATO_DEPLOYMENT.diamond,
        abi: burntatoAbi,
        functionName: "currentRoundId",
      }),
      client.readContract({
        address: BURNTATO_DEPLOYMENT.diamond,
        abi: burntatoAbi,
        functionName: "roundFunding",
        args: [roundId],
      }).then((values) => ({ values, available: true })).catch(async () => ({
        values: await client.readContract({
          address: BURNTATO_DEPLOYMENT.diamond,
          abi: burntatoAbi,
          functionName: "roundReserves",
          args: [roundId],
        }).then(([winnerReserve, recoveryReserve]) => [winnerReserve, recoveryReserve, 0n, 0n] as const),
        available: false,
      })),
    ]);
    if (roundId <= currentRoundId) return null;
    return {
      currentRoundId,
      roundId,
      winnerReserve: funding.values[0],
      recoveryReserve: funding.values[1],
      winnerSponsored: funding.values[2],
      recoverySponsored: funding.values[3],
      fundingBreakdownAvailable: funding.available,
    };
  } catch {
    return null;
  }
});
