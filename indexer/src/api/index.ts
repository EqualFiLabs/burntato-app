import { asc, count, gte, max } from "ponder";
import { db } from "ponder:api";
import { indexedEvent } from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors({ origin: process.env.PONDER_ALLOWED_ORIGIN || "*" }));

async function status() {
  const [row] = await db.select({ events: count(), indexedBlock: max(indexedEvent.blockNumber) }).from(indexedEvent);
  return { chainId: 46_630, deployment: "robinhood-testnet-46630", events: Number(row?.events ?? 0), indexedBlock: row?.indexedBlock?.toString() ?? null };
}

// Ponder owns /ready and /status for process and sync health. This route adds
// deployment identity and the latest indexed event for application diagnostics.
app.get("/burntato/deployment", async (context) => context.json(await status()));

app.get("/events", async (context) => {
  const rawFrom = context.req.query("fromBlock") ?? "0";
  const rawLimit = context.req.query("limit") ?? "1000";
  if (!/^\d+$/.test(rawFrom) || !/^\d+$/.test(rawLimit)) return context.json({ error: "Invalid fromBlock or limit." }, 400);
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 5_000) return context.json({ error: "Limit must be between 1 and 5000." }, 400);
  const rows = await db.select().from(indexedEvent).where(gte(indexedEvent.blockNumber, BigInt(rawFrom))).orderBy(asc(indexedEvent.blockNumber), asc(indexedEvent.logIndex)).limit(limit);
  context.header("Cache-Control", "public, max-age=2, stale-while-revalidate=5");
  return context.json({
    chainId: 46_630,
    items: rows.map((row) => ({
      source: row.source,
      name: row.name,
      transactionHash: row.transactionHash,
      logIndex: row.logIndex,
      blockNumber: row.blockNumber.toString(),
      blockTimestamp: row.blockTimestamp.toString(),
      args: JSON.parse(row.args),
    })),
  });
});

export default app;
