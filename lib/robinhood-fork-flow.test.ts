import { describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  formatEther,
  http,
  maxUint256,
  parseAbi,
  parseAbiParameters,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { robinhoodTestnet } from "./burntato/chain";
import { burntatoAbi, BURNTATO_DEPLOYMENT } from "./burntato/contract";
import { activationRegistryAbi, erc20Abi, faucetAbi, genesisVaultAbi, operatorNftAbi, operatorRewardsAbi } from "./operators/contracts";
import { permit2Abi, universalRouterAbi, v4QuoterAbi } from "./portal/contracts";
import { buildSwapPlan, minimumOutput, routerCommands } from "./portal/router";

const forkRpcUrl = process.env.BURNTATO_FORK_RPC_URL;
const localOnlyKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const permitSingleParams = parseAbiParameters("((address token,uint160 amount,uint48 expiration,uint48 nonce) details,address spender,uint256 sigDeadline) permitSingle,bytes signature");
const activationCostAbi = parseAbi(["function tierCost(uint8 tier) view returns (uint256)"]);

describe.skipIf(!forkRpcUrl)("Robinhood fork value flow", () => {
  const account = privateKeyToAccount(localOnlyKey);
  const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http(forkRpcUrl) });
  const walletClient = createWalletClient({ account, chain: robinhoodTestnet, transport: http(forkRpcUrl) });

  async function send(parameters: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[]; value?: bigint }): Promise<Hash> {
    const hash = await walletClient.writeContract(parameters as never);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");
    return hash;
  }

  it("claims, buys, activates, registers, earns, claims, and swaps both directions", async () => {
    expect(await publicClient.getChainId()).toBe(BURNTATO_DEPLOYMENT.chainId);
    expect(await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.operatorNft, abi: operatorNftAbi, functionName: "ownerOf", args: [1n] })).toBe(BURNTATO_DEPLOYMENT.genesisVault);

    const claimAmount = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.faucet, abi: faucetAbi, functionName: "CLAIM_AMOUNT" });
    await send({ address: BURNTATO_DEPLOYMENT.faucet, abi: faucetAbi, functionName: "claim" });
    expect(await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.statics, abi: erc20Abi, functionName: "balanceOf", args: [account.address] })).toBe(claimAmount);

    const quote = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.genesisVault, abi: genesisVaultAbi, functionName: "quoteGenesisPurchase" });
    expect(quote.epochActive).toBe(true);
    await send({ address: BURNTATO_DEPLOYMENT.statics, abi: erc20Abi, functionName: "approve", args: [BURNTATO_DEPLOYMENT.genesisVault, quote.staticsPrice] });
    await send({ address: BURNTATO_DEPLOYMENT.genesisVault, abi: genesisVaultAbi, functionName: "buyGenesis", args: [1n, account.address], value: quote.requiredNative });
    expect(await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.operatorNft, abi: operatorNftAbi, functionName: "ownerOf", args: [1n] })).toBe(account.address);

    const tierOneCost = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.activationRegistry, abi: activationCostAbi, functionName: "tierCost", args: [1] });
    await send({ address: BURNTATO_DEPLOYMENT.statics, abi: erc20Abi, functionName: "approve", args: [BURNTATO_DEPLOYMENT.activationRegistry, tierOneCost] });
    await send({ address: BURNTATO_DEPLOYMENT.activationRegistry, abi: activationRegistryAbi, functionName: "activate", args: [1n, 1] });
    await send({ address: BURNTATO_DEPLOYMENT.operatorRewardsRouter, abi: operatorRewardsAbi, functionName: "register", args: [1n] });

    const protocol = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "protocolConfig" });
    await send({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "buyPotato", value: protocol.startingPrice });
    const startedRound = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "getRound", args: [1n] });
    expect(startedRound.config.operatorPurchaseBps).toBe(1_500);
    expect(startedRound.currentHolder).toBe(account.address);
    expect(startedRound.activated).toBe(true);
    const operatorPreview = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.operatorRewardsRouter, abi: operatorRewardsAbi, functionName: "previewRewards", args: [1n] });
    expect(operatorPreview[3]).toBeGreaterThan(0n);
    await send({ address: BURNTATO_DEPLOYMENT.operatorRewardsRouter, abi: operatorRewardsAbi, functionName: "claim", args: [1n, account.address] });

    const poolKey = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: burntatoAbi, functionName: "canonicalPoolKey" });
    const buyInput = parseEther("0.001");
    const buyQuote = await publicClient.simulateContract({
      address: BURNTATO_DEPLOYMENT.quoter,
      abi: v4QuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey, zeroForOne: true, exactAmount: buyInput, hookData: "0x" }],
    });
    const potatoBeforeBuy = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
    const buyPlan = buildSwapPlan(poolKey, "buy", buyInput, minimumOutput(buyQuote.result[0], 100));
    const buyBlock = await publicClient.getBlock();
    await send({ address: BURNTATO_DEPLOYMENT.universalRouter, abi: universalRouterAbi, functionName: "execute", args: [routerCommands("buy"), [buyPlan], buyBlock.timestamp + 300n], value: buyInput });
    const potatoAfterBuy = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
    expect(potatoAfterBuy).toBeGreaterThan(potatoBeforeBuy);

    const sellInput = (potatoAfterBuy - potatoBeforeBuy) / 2n;
    const sellQuote = await publicClient.simulateContract({
      address: BURNTATO_DEPLOYMENT.quoter,
      abi: v4QuoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey, zeroForOne: false, exactAmount: sellInput, hookData: "0x" }],
    });
    await send({ address: BURNTATO_DEPLOYMENT.diamond, abi: erc20Abi, functionName: "approve", args: [BURNTATO_DEPLOYMENT.permit2, maxUint256] });
    const allowance = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.permit2, abi: permit2Abi, functionName: "allowance", args: [account.address, BURNTATO_DEPLOYMENT.diamond, BURNTATO_DEPLOYMENT.universalRouter] });
    const sellBlock = await publicClient.getBlock();
    const sigDeadline = sellBlock.timestamp + 1_200n;
    const permitSingle = {
      details: { token: BURNTATO_DEPLOYMENT.diamond, amount: sellInput, expiration: Number(sigDeadline), nonce: allowance[2] },
      spender: BURNTATO_DEPLOYMENT.universalRouter,
      sigDeadline,
    } as const;
    const signature = await walletClient.signTypedData({
      domain: { name: "Permit2", chainId: BURNTATO_DEPLOYMENT.chainId, verifyingContract: BURNTATO_DEPLOYMENT.permit2 },
      types: {
        PermitDetails: [{ name: "token", type: "address" }, { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }, { name: "nonce", type: "uint48" }],
        PermitSingle: [{ name: "details", type: "PermitDetails" }, { name: "spender", type: "address" }, { name: "sigDeadline", type: "uint256" }],
      },
      primaryType: "PermitSingle",
      message: permitSingle,
    });
    const sellPlan = buildSwapPlan(poolKey, "sell", sellInput, minimumOutput(sellQuote.result[0], 100));
    const permitInput = encodeAbiParameters(permitSingleParams, [permitSingle, signature]);
    await send({ address: BURNTATO_DEPLOYMENT.universalRouter, abi: universalRouterAbi, functionName: "execute", args: [routerCommands("sell"), [permitInput, sellPlan], sellBlock.timestamp + 300n] });
    const potatoAfterSell = await publicClient.readContract({ address: BURNTATO_DEPLOYMENT.diamond, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
    expect(potatoAfterSell).toBeLessThan(potatoAfterBuy);
    expect(Number(formatEther(potatoAfterSell))).toBeGreaterThanOrEqual(0);
  }, 60_000);
});
