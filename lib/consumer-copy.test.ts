import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const consumerSources = [
  "components/BurntatoApp.tsx",
  "components/LivePortalScreen.tsx",
  "components/OperatorScreen.tsx",
  "providers/burntato-context.tsx",
  "lib/portal/router.ts",
];

const internalPhrases = [
  "bounded direct-RPC",
  "deployed Burntato pool",
  "durable Ponder index",
  "exact-input swap",
  "Finalize holder emission",
  "hook governance",
  "intentionally unavailable",
  "Live V4",
  "no durable indexer URL",
  "no fabricated USD values",
  "Permit2 authorization",
  "public wallet environment variables",
  "Revenue rail",
  "Rewards are validated onchain",
  "Spectator mode",
  "Universal Router V4",
];

describe("consumer-facing copy", () => {
  it("does not expose internal infrastructure language", () => {
    const source = consumerSources
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    for (const phrase of internalPhrases) {
      expect(source).not.toContain(phrase);
    }
  });
});
