import { describe, expect, it } from "vitest";

import { parseFundingAmount, parseFutureRoundId, parseSponsorship, publicSiteUrl, roundSharePath } from "./sponsorship";

describe("future-round sponsorship", () => {
  it("parses exact ETH amounts without accepting unsafe number syntax", () => {
    expect(parseFundingAmount("")).toBe(0n);
    expect(parseFundingAmount("0.003")).toBe(3_000_000_000_000_000n);
    expect(parseFundingAmount("1.000000000000000001")).toBe(1_000_000_000_000_000_001n);
    expect(parseFundingAmount("1e-3")).toBeNull();
    expect(parseFundingAmount("0.0000000000000000001")).toBeNull();
    expect(parseFundingAmount("-1")).toBeNull();
  });

  it("requires a strictly future target and at least one funded pot", () => {
    expect(parseFutureRoundId("10", 9n)).toBe(10n);
    expect(parseFutureRoundId("9", 9n)).toBeNull();
    expect(parseSponsorship("10", "1", "2", 9n)).toEqual({
      roundId: 10n,
      winnerAmount: 1_000_000_000_000_000_000n,
      recoveryAmount: 2_000_000_000_000_000_000n,
      total: 3_000_000_000_000_000_000n,
    });
    expect(parseSponsorship("10", "", "", 9n)).toBeNull();
  });

  it("accepts only credential-free public origins for canonical links", () => {
    expect(publicSiteUrl("https://burntato.example/app/")?.toString()).toBe("https://burntato.example/app");
    expect(publicSiteUrl("https://user:secret@burntato.example")).toBeNull();
    expect(publicSiteUrl("javascript:alert(1)")).toBeNull();
    expect(roundSharePath(42n)).toBe("/rounds/42");
  });
});
