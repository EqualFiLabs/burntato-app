import { decodeEventLog, type Address, type PublicClient } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./contract";

export type BurntatoEvent = {
  name: "PotatoPurchased" | "EmissionFinalized" | "TreasuryRewardFinalized" | "RecoveryCommitted" | "RoundSettled" | "WinnerClaimed" | "RecoveryClaimed" | "WinnerReserveFunded" | "NextRoundWinnerFunded" | "RecoveryReserveFunded";
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>;
};

export type LeaderboardRow = {
  address: Address;
  earned: bigint;
  roundEarned: bigint;
  wins: number;
  roundWins: number;
  hold: bigint;
  roundHold: bigint;
  recovery: bigint;
  roundRecovery: bigint;
  committed: bigint;
  roundCommitted: bigint;
};

export type RewardCandidate = {
  id: string;
  kind: "winner" | "recovery";
  roundId: bigint;
  amount: bigint;
  claimed: boolean;
};

export type IndexedHistory = {
  events: BurntatoEvent[];
  indexedBlock: bigint | null;
};

const TRACKED_EVENTS = new Set<BurntatoEvent["name"]>([
  "PotatoPurchased",
  "EmissionFinalized",
  "TreasuryRewardFinalized",
  "RecoveryCommitted",
  "RoundSettled",
  "WinnerClaimed",
  "RecoveryClaimed",
  "WinnerReserveFunded",
  "NextRoundWinnerFunded",
  "RecoveryReserveFunded",
]);

function reviveIndexedValue(value: unknown): unknown {
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  if (Array.isArray(value)) return value.map(reviveIndexedValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reviveIndexedValue(item)]));
  }
  return value;
}

export async function fetchIndexedHistory(indexerUrl: string, fromBlock: bigint): Promise<IndexedHistory> {
  const baseUrl = indexerUrl.endsWith("/") ? indexerUrl : `${indexerUrl}/`;
  const statusResponse = await fetch(new URL("status", baseUrl), { headers: { Accept: "application/json" } });
  if (!statusResponse.ok) throw new Error(`Indexer status returned ${statusResponse.status}`);
  const status = await statusResponse.json() as { robinhoodTestnet?: { id?: number; block?: { number?: number } } };
  const indexedBlock = status.robinhoodTestnet?.block?.number;
  if (status.robinhoodTestnet?.id !== BURNTATO_DEPLOYMENT.chainId || !Number.isSafeInteger(indexedBlock)) {
    throw new Error("Indexer deployment mismatch");
  }
  const events: BurntatoEvent[] = [];
  let cursor: { blockNumber: string; logIndex: number } | null = null;
  for (let page = 0; page < 100; page += 1) {
    const eventsUrl = new URL("events", baseUrl);
    eventsUrl.searchParams.set("fromBlock", fromBlock.toString());
    eventsUrl.searchParams.set("limit", "5000");
    if (cursor) {
      eventsUrl.searchParams.set("afterBlock", cursor.blockNumber);
      eventsUrl.searchParams.set("afterLogIndex", String(cursor.logIndex));
    }
    const eventsResponse = await fetch(eventsUrl, { headers: { Accept: "application/json" } });
    if (!eventsResponse.ok) throw new Error(`Indexer events returned ${eventsResponse.status}`);
    const payload = await eventsResponse.json() as {
      chainId?: number;
      deployment?: string;
      nextCursor?: { blockNumber?: string; logIndex?: number } | null;
      items?: Array<{ source?: string; name?: string; transactionHash?: string; logIndex?: number; blockNumber?: string; args?: unknown }>;
    };
    if (
      payload.chainId !== BURNTATO_DEPLOYMENT.chainId
      || payload.deployment !== BURNTATO_DEPLOYMENT.deploymentId
      || !Array.isArray(payload.items)
    ) throw new Error("Indexer deployment mismatch");
    for (const item of payload.items) {
      if (item.source !== "burntato" || !TRACKED_EVENTS.has(item.name as BurntatoEvent["name"])) continue;
      if (!item.transactionHash?.startsWith("0x") || !/^\d+$/.test(item.blockNumber ?? "") || !Number.isInteger(item.logIndex)) continue;
      events.push({
        name: item.name as BurntatoEvent["name"],
        blockNumber: BigInt(item.blockNumber!),
        transactionHash: item.transactionHash as `0x${string}`,
        logIndex: item.logIndex!,
        args: reviveIndexedValue(item.args) as Record<string, unknown>,
      });
    }
    const next = payload.nextCursor;
    if (!next) break;
    if (!/^\d+$/.test(next.blockNumber ?? "") || !Number.isSafeInteger(next.logIndex) || (cursor && next.blockNumber === cursor.blockNumber && next.logIndex === cursor.logIndex)) throw new Error("Invalid indexer cursor");
    cursor = { blockNumber: next.blockNumber!, logIndex: next.logIndex! };
    if (page === 99) throw new Error("Indexer pagination limit exceeded");
  }
  return {
    events: dedupeEvents(events),
    indexedBlock: BigInt(indexedBlock!),
  };
}

export function eventKey(event: Pick<BurntatoEvent, "transactionHash" | "logIndex">): string {
  return `${event.transactionHash}-${event.logIndex}`;
}

export function dedupeEvents(events: BurntatoEvent[]): BurntatoEvent[] {
  return [...new Map(events.map((event) => [eventKey(event), event])).values()].sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
  );
}

export async function scanBurntatoEvents(
  client: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<BurntatoEvent[]> {
  const events: BurntatoEvent[] = [];
  for (let start = fromBlock; start <= toBlock; start += 5_000n) {
    const end = start + 4_999n > toBlock ? toBlock : start + 4_999n;
    const logs = await client.getLogs({ address: BURNTATO_DEPLOYMENT.diamond, fromBlock: start, toBlock: end });
    for (const log of logs) {
      try {
        const decoded = decodeEventLog({ abi: burntatoAbi, data: log.data, topics: log.topics, strict: false });
        if (!TRACKED_EVENTS.has(decoded.eventName as BurntatoEvent["name"])) continue;
        events.push({
          name: decoded.eventName as BurntatoEvent["name"],
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          args: decoded.args as Record<string, unknown>,
        });
      } catch {
        // A Diamond emits events from facets outside this intentionally minimal ABI.
      }
    }
  }
  return events;
}

function asAddress(value: unknown): Address | null {
  return typeof value === "string" && value.startsWith("0x") ? (value.toLowerCase() as Address) : null;
}

function asBigInt(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

export function buildLeaderboard(events: BurntatoEvent[], currentRoundId: bigint): LeaderboardRow[] {
  const rows = new Map<Address, LeaderboardRow>();
  const commitments = new Map<string, bigint>();
  const rowFor = (address: Address) => {
    let row = rows.get(address);
    if (!row) {
      row = { address, earned: 0n, roundEarned: 0n, wins: 0, roundWins: 0, hold: 0n, roundHold: 0n, recovery: 0n, roundRecovery: 0n, committed: 0n, roundCommitted: 0n };
      rows.set(address, row);
    }
    return row;
  };

  for (const event of events) {
    const roundId = asBigInt(event.args.roundId);
    if (event.name === "EmissionFinalized" || event.name === "TreasuryRewardFinalized") {
      const address = asAddress(event.args.holder);
      if (!address) continue;
      const row = rowFor(address);
      const earned = asBigInt(event.args.earned);
      row.earned += earned;
      if (roundId === currentRoundId) row.roundEarned += earned;
      if (event.name === "EmissionFinalized") {
        const held = asBigInt(event.args.heldSeconds);
        row.hold += held;
        if (roundId === currentRoundId) row.roundHold += held;
      }
    } else if (event.name === "RecoveryCommitted") {
      const address = asAddress(event.args.account);
      if (!address) continue;
      const amount = asBigInt(event.args.amount);
      const row = rowFor(address);
      row.committed += amount;
      if (roundId === currentRoundId) row.roundCommitted += amount;
      const key = `${roundId}:${address}`;
      commitments.set(key, (commitments.get(key) ?? 0n) + amount);
    } else if (event.name === "RoundSettled") {
      const winner = asAddress(event.args.winner);
      if (winner) {
        const row = rowFor(winner);
        row.wins += 1;
        if (roundId === currentRoundId) row.roundWins += 1;
      }
      const recoveryPool = asBigInt(event.args.recoveryPool);
      const totalCommitted = asBigInt(event.args.totalCommitted);
      if (recoveryPool === 0n || totalCommitted === 0n) continue;
      for (const [key, commitment] of commitments) {
        if (!key.startsWith(`${roundId}:`)) continue;
        const address = key.slice(key.indexOf(":") + 1) as Address;
        const entitlement = recoveryPool * commitment / totalCommitted;
        const row = rowFor(address);
        row.recovery += entitlement;
        if (roundId === currentRoundId) row.roundRecovery += entitlement;
      }
    }
  }
  return [...rows.values()];
}

export function candidateRoundIds(events: BurntatoEvent[], account: Address): bigint[] {
  const normalized = account.toLowerCase();
  const rounds = new Set<bigint>();
  for (const event of events) {
    if (event.name === "RoundSettled" && asAddress(event.args.winner) === normalized) rounds.add(asBigInt(event.args.roundId));
    if (event.name === "RecoveryCommitted" && asAddress(event.args.account) === normalized) rounds.add(asBigInt(event.args.roundId));
  }
  return [...rounds].sort((a, b) => a > b ? -1 : 1);
}

export function sponsorshipRoundIds(events: BurntatoEvent[], currentRoundId: bigint): bigint[] {
  const rounds = new Set<bigint>([currentRoundId + 1n]);
  for (const event of events) {
    if (
      event.name !== "WinnerReserveFunded"
      && event.name !== "NextRoundWinnerFunded"
      && event.name !== "RecoveryReserveFunded"
    ) continue;
    const targetRoundId = asBigInt(event.args.targetRoundId);
    if (targetRoundId > currentRoundId) rounds.add(targetRoundId);
  }
  return [...rounds].sort((a, b) => a < b ? -1 : 1).slice(0, 100);
}
