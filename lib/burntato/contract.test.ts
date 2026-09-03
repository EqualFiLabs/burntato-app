import { describe, expect, it } from "vitest";
import { getAbiItem, getAddress, toFunctionSelector } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./contract";

describe("Robinhood deployment parity", () => {
  it("pins the deployed chain, source, and checksummed contracts", () => {
    expect(BURNTATO_DEPLOYMENT.chainId).toBe(46_630);
    expect(BURNTATO_DEPLOYMENT.deploymentBlock).toBe(112_339_401n);
    expect(BURNTATO_DEPLOYMENT.sourceCommit).toBe("07688de3193492aca399c8bbadc9321162e5f726");
    for (const address of [
      BURNTATO_DEPLOYMENT.diamond,
      BURNTATO_DEPLOYMENT.operatorRewardsRouter,
      BURNTATO_DEPLOYMENT.operatorNft,
      BURNTATO_DEPLOYMENT.activationRegistry,
      BURNTATO_DEPLOYMENT.genesisVault,
      BURNTATO_DEPLOYMENT.genesisLaunchDistributor,
      BURNTATO_DEPLOYMENT.faucet,
    ]) {
      expect(getAddress(address)).toBe(address);
    }
  });

  it("keeps deployed game selectors and tuple order stable", () => {
    expect(toFunctionSelector("protocolConfig()")).toBe("0xf5efbb4f");
    expect(toFunctionSelector("getRound(uint256)")).toBe("0x8f1327c0");

    const protocolConfig = getAbiItem({ abi: burntatoAbi, name: "protocolConfig" });
    expect(protocolConfig.type).toBe("function");
    if (protocolConfig.type !== "function") return;
    const tuple = protocolConfig.outputs[0];
    expect(tuple.type).toBe("tuple");
    if (tuple.type !== "tuple") return;
    expect(tuple.components.map((component) => component.name)).toEqual([
      "startingPrice",
      "priceIncreaseBps",
      "roundTimeout",
      "roundEmissionBudget",
      "emissionStepBps",
      "emissionVestingDuration",
      "winnerBps",
      "recoveryBps",
      "treasuryBps",
      "recoveryBurnBps",
      "recoveryTreasuryBps",
      "buybackBps",
      "operatorPurchaseBps",
      "roundTimeoutDecay",
      "minimumRoundTimeout",
    ]);
  });
});
