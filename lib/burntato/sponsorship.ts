import { parseEther } from "viem";

export type SponsoredRound = {
  roundId: bigint;
  winnerReserve: bigint;
  recoveryReserve: bigint;
};

const ETH_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{0,18})?$/;
const ROUND_ID = /^[1-9]\d*$/;

export function parseFundingAmount(value: string): bigint | null {
  const normalized = value.trim();
  if (!normalized) return 0n;
  if (!ETH_AMOUNT.test(normalized)) return null;
  try {
    return parseEther(normalized);
  } catch {
    return null;
  }
}

export function parseFutureRoundId(value: string, currentRoundId: bigint): bigint | null {
  const normalized = value.trim();
  if (!ROUND_ID.test(normalized)) return null;
  const roundId = BigInt(normalized);
  return roundId > currentRoundId ? roundId : null;
}

export function parseSponsorship(
  roundValue: string,
  winnerValue: string,
  recoveryValue: string,
  currentRoundId: bigint,
): { roundId: bigint; winnerAmount: bigint; recoveryAmount: bigint; total: bigint } | null {
  const roundId = parseFutureRoundId(roundValue, currentRoundId);
  const winnerAmount = parseFundingAmount(winnerValue);
  const recoveryAmount = parseFundingAmount(recoveryValue);
  if (roundId === null || winnerAmount === null || recoveryAmount === null) return null;
  const total = winnerAmount + recoveryAmount;
  return total > 0n ? { roundId, winnerAmount, recoveryAmount, total } : null;
}

export function publicSiteUrl(value: string | undefined): URL | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function roundSharePath(roundId: bigint): string {
  return `/rounds/${roundId.toString()}`;
}
