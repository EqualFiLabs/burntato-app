import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const consumerSources = [
  "components/BurntatoApp.tsx",
  "components/LivePortalScreen.tsx",
  "components/OperatorScreen.tsx",
  "components/RulesScreen.tsx",
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

  it("describes the pre-swap wallet permission accurately", () => {
    const portalSource = readFileSync(resolve(process.cwd(), "components/LivePortalScreen.tsx"), "utf8");

    expect(portalSource).toContain("Confirm permission for this POTATO swap in your wallet.");
    expect(portalSource).not.toContain("Confirm this POTATO swap in your wallet.");
  });

  it("keeps the Portal title as a primary heading", () => {
    const portalSource = readFileSync(resolve(process.cwd(), "components/LivePortalScreen.tsx"), "utf8");

    expect(portalSource).toContain('<h1 id="live-portal-title">ETH ↔ POTATO</h1>');
    expect(portalSource).not.toContain('<h2 id="live-portal-title">ETH ↔ POTATO</h2>');
  });

  it("explains self-grabs and transferable Operator registrations", () => {
    const appSource = readFileSync(resolve(process.cwd(), "components/BurntatoApp.tsx"), "utf8");
    const rulesSource = readFileSync(resolve(process.cwd(), "components/RulesScreen.tsx"), "utf8");

    expect(appSource).toContain("Grab your own Hot Potato again?");
    expect(rulesSource).toContain("The current holder may Grab again to defend their position");
    expect(rulesSource).toContain("Registration never locks the NFT");
    expect(rulesSource).toContain("they are not a player action in this app");
  });
});
