import { describe, expect, it } from "vitest";
import { createPublicClient, http, parseEther } from "viem";

import { robinhoodTestnet } from "./burntato/chain";
import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./burntato/contract";
import { erc20Abi, faucetAbi, genesisDistributorAbi, genesisVaultAbi, operatorNftAbi, operatorRewardsAbi } from "./operators/contracts";
import { hookAbi, v4QuoterAbi } from "./portal/contracts";

const liveRpcUrl = process.env.BURNTATO_LIVE_RPC_URL;

describe.skipIf(!liveRpcUrl)("deployed Robinhood readbacks", () => {
  const client = createPublicClient({ chain: robinhoodTestnet, transport: http(liveRpcUrl) });

  it("matches deployment code, game, Operator, faucet, and launch state", async () => {
    expect(await client.getChainId()).toBe(BURNTATO_DEPLOYMENT.chainId);
    for (const address of [
      BURNTATO_DEPLOYMENT.diamond,
      BURNTATO_DEPLOYMENT.operatorRewardsRouter,
      BURNTATO_DEPLOYMENT.operatorNft,
      BURNTATO_DEPLOYMENT.activationRegistry,
      BURNTATO_DEPLOYMENT.genesisVault,
      BURNTATO_DEPLOYMENT.genesisLaunchDistributor,
      BURNTATO_DEPLOYMENT.faucet,
      BURNTATO_DEPLOYMENT.quoter,
      BURNTATO_DEPLOYMENT.universalRouter,
      BURNTATO_DEPLOYMENT.permit2,
    ]) expect(await client.getCode({ address })).not.toBeUndefined();

    const [roundId, protocol, purchasesPaused, commitmentsPaused, faucetAmount, faucetBalance, quote, owner, routerWeight, routerPending, launchFinalized] = await Promise.all([
      client.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "currentRoundId" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "protocolConfig" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "purchasesPaused" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "commitmentsPaused" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.faucet, abi: faucetAbi, functionName: "CLAIM_AMOUNT" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.statics, abi: erc20Abi, functionName: "balanceOf", args: [BURNTATO_DEPLOYMENT.faucet] }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.genesisVault, abi: genesisVaultAbi, functionName: "quoteGenesisPurchase" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.operatorNft, abi: operatorNftAbi, functionName: "ownerOf", args: [1n] }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.operatorRewardsRouter, abi: operatorRewardsAbi, functionName: "totalRegisteredWeight" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.operatorRewardsRouter, abi: operatorRewardsAbi, functionName: "pendingRevenue" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.genesisLaunchDistributor, abi: genesisDistributorAbi, functionName: "finalized" }),
    ]);
    expect(roundId).toBe(0n);
    expect(protocol.startingPrice).toBe(10_000_000_000_000n);
    expect(protocol.priceIncreaseBps).toBe(100);
    expect(protocol.roundTimeout).toBe(600n);
    expect(protocol.roundTimeoutDecay).toBe(60n);
    expect(protocol.minimumRoundTimeout).toBe(60n);
    expect(protocol.operatorPurchaseBps).toBe(1_500);
    expect(protocol.winnerBps + protocol.recoveryBps + protocol.treasuryBps + protocol.buybackBps + protocol.operatorPurchaseBps).toBe(10_000);
    expect(purchasesPaused).toBe(false);
    expect(commitmentsPaused).toBe(false);
    expect(faucetAmount).toBe(200_000n * 10n ** 18n);
    expect(faucetBalance).toBe(faucetAmount);
    expect(quote.staticsPrice).toBe(180_000n * 10n ** 18n);
    expect(quote.epochActive).toBe(true);
    expect(owner).toBe(BURNTATO_DEPLOYMENT.genesisVault);
    expect(routerWeight).toBe(0n);
    expect(routerPending).toBe(0n);
    expect(launchFinalized).toBe(false);
  });

  it("quotes the canonical live V4 pool and confirms its fee split", async () => {
    const [poolKey, buysEnabled, feeBps, operatorShare] = await Promise.all([
      client.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "canonicalPoolKey" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.hook, abi: hookAbi, functionName: "externalBuysEnabled" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.hook, abi: hookAbi, functionName: "feeBps" }),
      client.readContract({ address: BURNTATO_DEPLOYMENT.hook, abi: hookAbi, functionName: "operatorRewardShareBps" }),
    ]);
    expect(poolKey.currency0).toBe("0x0000000000000000000000000000000000000000");
    expect(poolKey.currency1).toBe(BURNTATO_DEPLOYMENT.diamond);
    expect(poolKey.hooks).toBe(BURNTATO_DEPLOYMENT.hook);
    expect(buysEnabled).toBe(true);
    expect(feeBps).toBe(100);
    expect(operatorShare).toBe(4_000);
    const result = await client.simulateContract({
      address: BURNTATO_DEPLOYMENT.quoter,
      abi: v4QuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey, zeroForOne: true, exactAmount: parseEther("0.001"), hookData: "0x" }],
    });
    expect(result.result[0]).toBeGreaterThan(0n);
    expect(result.result[1]).toBeGreaterThan(0n);
  });
});
