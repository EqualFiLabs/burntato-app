import { describe, expect, it } from "vitest";
import { getAbiItem, getAddress, toFunctionSelector, type Abi } from "viem";

import { burntatoAbi, BURNTATO_DEPLOYMENT, deploymentFromEnvironment } from "./contract";
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

  it("requires and checksums a complete custom deployment", () => {
    const custom = deploymentFromEnvironment({
      NEXT_PUBLIC_BURNTATO_NETWORK: "Local fork",
      NEXT_PUBLIC_BURNTATO_CHAIN_ID: "4663",
      NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID: "local",
      NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS: "0xfb298fdbae952a13bce101a00af5e955f1ce86a6",
      NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK: "47690623",
      NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT: "974ac68",
      NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS: "0xec679422d9a86f098cf0ef080550fd5072295a1b",
      NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS: "0x1492b5b043fe3009f40f1f57dab2d25034702444",
      NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS: "0xb7a4a75d25960a78a2f6bd3e854bc932bab90681",
      NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS: "0xceb4527517b32ff2cc9daa247f9958416fab47b8",
      NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK: "47690600",
      NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS: "0x39d115928f8f1baebfaed841986df63d019ce6c3",
      NEXT_PUBLIC_BURNTATO_WETH_ADDRESS: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
      NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
      NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
      NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS: "0x8876789976decbfcbbbe364623c63652db8c0904",
      NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS: "0x000000000022d473030f116ddee9f6b43ac78ba3",
    });
    expect(custom.chainId).toBe(4_663);
    expect(custom.diamond).toBe("0xfB298fDbae952A13BCE101A00af5E955f1CE86A6");
    expect(custom.explorer).toBe("");
    expect(() => deploymentFromEnvironment({ NEXT_PUBLIC_BURNTATO_CHAIN_ID: "4663" })).toThrow(/NEXT_PUBLIC_BURNTATO_NETWORK/);
  });

  it("keeps deployed game selectors and tuple order stable", () => {
    expect(toFunctionSelector("protocolConfig()")).toBe("0xf5efbb4f");
    expect(toFunctionSelector("getRound(uint256)")).toBe("0x8f1327c0");
    expect(toFunctionSelector("paused()")).toBe("0x5c975abb");
    expect(toFunctionSelector("purchasesInitialized()")).toBe("0x71e67bba");
    expect(toFunctionSelector("winnerReserveEth()")).toBe("0x0649cf55");
    expect(toFunctionSelector("nextTreasuryRewardBudget()")).toBe("0x9c4c6d76");

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
      "nextRoundWinnerBps",
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
    expect(selector(operatorRewardsAbi, "claimBatch")).toBe("0x18d052e3");
    expect(selector(genesisDistributorAbi, "registerGenesis")).toBe("0xb412922e");
    expect(selector(genesisDistributorAbi, "claimGenesis")).toBe("0x813db3a2");
    expect(selector(v4QuoterAbi, "quoteExactInputSingle")).toBe("0xaa9d21cb");
    expect(selector(universalRouterAbi, "execute")).toBe("0x3593564c");
    expect(selector(permit2Abi, "allowance")).toBe("0x927da105");
  });
});
