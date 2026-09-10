import { describe, expect, it, vi } from "vitest";

import { parsePublicRpcUrl, readRuntimeEnvironment } from "./DAppProviders";

describe("public runtime environment", () => {
  it("accepts only absolute credential-free HTTP RPC URLs", () => {
    const problems: string[] = [];
    expect(parsePublicRpcUrl("https://rpc.testnet.chain.robinhood.com", "RPC", problems)).toBe("https://rpc.testnet.chain.robinhood.com/");
    expect(problems).toEqual([]);

    const unsafeProblems: string[] = [];
    expect(parsePublicRpcUrl("https://user:secret@example.com", "RPC", unsafeProblems)).toBe("");
    expect(unsafeProblems[0]).toContain("credential-free");
  });

  it("separates spectator readiness from optional Privy wallet readiness", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(readRuntimeEnvironment({ NEXT_PUBLIC_BURNTATO_RPC_URL: "https://rpc.example" })).toMatchObject({ gameConfigured: true, walletConfigured: false });
    expect(readRuntimeEnvironment({ NEXT_PUBLIC_BURNTATO_RPC_URL: "https://rpc.example", NEXT_PUBLIC_PRIVY_APP_ID: "app-id" })).toMatchObject({ gameConfigured: true, walletConfigured: true });
    expect(readRuntimeEnvironment({ NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL: "https://legacy.example" })).toMatchObject({ gameConfigured: true, rpcUrl: "https://legacy.example/" });
    expect(readRuntimeEnvironment({ NEXT_PUBLIC_PRIVY_APP_ID: "app-id" })).toMatchObject({ gameConfigured: false, walletConfigured: false });
    warn.mockRestore();
  });
});
