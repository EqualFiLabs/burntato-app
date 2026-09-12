import "server-only";

import { cache } from "react";
import { createPublicClient, http } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./contract";
import type { SponsoredRound } from "./sponsorship";

export const readSponsoredRound = cache(async (roundId: bigint): Promise<(SponsoredRound & { currentRoundId: bigint }) | null> => {
  const rpcUrl = process.env.NEXT_PUBLIC_BURNTATO_RPC_URL?.trim()
    ?? process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL?.trim();
  if (!rpcUrl || roundId <= 0n) return null;

  try {
    const url = new URL(rpcUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    const client = createPublicClient({ transport: http(url.toString(), { retryCount: 0, timeout: 4_000 }) });
    const [currentRoundId, reserves] = await Promise.all([
      client.readContract({
        address: BURNTATO_DEPLOYMENT.diamond,
        abi: burntatoAbi,
        functionName: "currentRoundId",
      }),
      client.readContract({
        address: BURNTATO_DEPLOYMENT.diamond,
        abi: burntatoAbi,
        functionName: "roundReserves",
        args: [roundId],
      }),
    ]);
    if (roundId <= currentRoundId) return null;
    return {
      currentRoundId,
      roundId,
      winnerReserve: reserves[0],
      recoveryReserve: reserves[1],
    };
  } catch {
    return null;
  }
});
