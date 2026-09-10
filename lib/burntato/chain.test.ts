import { describe, expect, it } from "vitest";

import { createBurntatoChain } from "./chain";

describe("Robinhood custom chain", () => {
  it("pins chain metadata and explorer routing", () => {
    const robinhoodTestnet = createBurntatoChain("https://rpc.testnet.chain.robinhood.com");
    expect(robinhoodTestnet.id).toBe(46_630);
    expect(robinhoodTestnet.nativeCurrency).toEqual({ name: "Ether", symbol: "ETH", decimals: 18 });
    expect(robinhoodTestnet.rpcUrls.default.http).toEqual(["https://rpc.testnet.chain.robinhood.com"]);
    expect(robinhoodTestnet.blockExplorers?.default.url).toBe("https://explorer.testnet.chain.robinhood.com");
    expect(robinhoodTestnet.testnet).toBe(true);
  });
});
