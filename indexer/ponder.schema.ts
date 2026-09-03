import { index, onchainTable } from "ponder";

export const indexedEvent = onchainTable(
  "indexed_event",
  (table) => ({
    key: table.text().primaryKey(),
    source: table.text().notNull(),
    name: table.text().notNull(),
    transactionHash: table.hex().notNull(),
    logIndex: table.integer().notNull(),
    blockNumber: table.bigint().notNull(),
    blockTimestamp: table.bigint().notNull(),
    args: table.text().notNull(),
  }),
  (table) => ({
    chronology: index().on(table.blockNumber, table.logIndex),
    bySource: index().on(table.source, table.blockNumber),
    byName: index().on(table.name, table.blockNumber),
  }),
);
