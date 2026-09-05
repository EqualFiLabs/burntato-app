import { describe, expect, it } from "vitest";
import { getAbiItem, getAddress, toFunctionSelector, type Abi } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./contract";
import { activationRegistryAbi, faucetAbi, genesisDistributorAbi, genesisVaultAbi, operatorRewardsAbi } from "../operators/contracts";
import { permit2Abi, universalRouterAbi, v4QuoterAbi } from "../portal/contracts";

describe("Robinhood deployment parity", () => {
  it("pins the deployed chain, source, and checksummed contracts", () => {
    expect(BURNTATO_DEPLOYMENT.chainId).toBe(46_630);
    expect(BURNTATO_DEPLOYMENT.deploymentBlock).toBe(113_055_786n);
    expect(BURNTATO_DEPLOYMENT.sourceCommit).toBe("1e3a49389baffd1aaff9c3bafbdf55e68d489200");
    for (const address of [
      BURNTATO_DEPLOYMENT.diamond,
      BURNTATO_DEPLOYMENT.operatorRewardsRouter,
      BURNTATO_DEPLOYMENT.operatorNft,
      BURNTATO_DEPLOYMENT.activationRegistry,
      BURNTATO_DEPLOYMENT.genesisVault,
      BURNTATO_DEPLOYMENT.genesisLaunchDistributor,
      BURNTATO_DEPLOYMENT.faucet,
      BURNTATO_DEPLOYMENT.hook,
      BURNTATO_DEPLOYMENT.quoter,
      BURNTATO_DEPLOYMENT.universalRouter,
      BURNTATO_DEPLOYMENT.permit2,
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

  it("keeps every app write and integration selector stable", () => {
    const selector = (abi: Abi, name: string) => {
      const item = getAbiItem({ abi, name });
      if (!item || item.type !== "function") throw new Error(`${name} is not a function`);
      return toFunctionSelector(item);
    };
    expect(selector(faucetAbi, "claim")).toBe("0x4e71d92d");
    expect(selector(genesisVaultAbi, "buyGenesis")).toBe("0xc12e4b23");
    expect(selector(activationRegistryAbi, "activate")).toBe("0x4578f5f0");
    expect(selector(operatorRewardsAbi, "register")).toBe("0xf207564e");
    expect(selector(operatorRewardsAbi, "sync")).toBe("0xb1357bf9");
    expect(selector(operatorRewardsAbi, "claim")).toBe("0xddd5e1b2");
    expect(selector(genesisDistributorAbi, "registerGenesis")).toBe("0xb412922e");
    expect(selector(genesisDistributorAbi, "claimGenesis")).toBe("0x813db3a2");
    expect(selector(v4QuoterAbi, "quoteExactInputSingle")).toBe("0xaa9d21cb");
    expect(selector(universalRouterAbi, "execute")).toBe("0x3593564c");
    expect(selector(permit2Abi, "allowance")).toBe("0x927da105");
  });
});
