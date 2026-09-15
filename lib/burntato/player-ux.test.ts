import { describe, expect, it } from "vitest";

import { requiresSelfGrabConfirmation, walletPlacement } from "./player-ux";

describe("player UX decisions", () => {
  it("requires confirmation only when the live holder grabs again", () => {
    const holder = "0x00000000000000000000000000000000000000aA";

    expect(requiresSelfGrabConfirmation("open", holder, holder.toLowerCase())).toBe(true);
    expect(requiresSelfGrabConfirmation("expired", holder, holder)).toBe(false);
    expect(requiresSelfGrabConfirmation("open", holder, "0x00000000000000000000000000000000000000bb")).toBe(false);
    expect(requiresSelfGrabConfirmation("open", undefined, holder)).toBe(false);
  });

  it("returns the connected wallet's one-based rank", () => {
    const addresses = [
      "0x00000000000000000000000000000000000000aA",
      "0x00000000000000000000000000000000000000bb",
    ];

    expect(walletPlacement(addresses, addresses[1].toUpperCase())).toBe(2);
    expect(walletPlacement(addresses, "0x00000000000000000000000000000000000000cc")).toBeNull();
    expect(walletPlacement(addresses, null)).toBeNull();
  });
});
