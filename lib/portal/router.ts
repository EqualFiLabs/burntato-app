import { concat, encodeAbiParameters, parseAbiParameters, type Address, type Hex } from "viem";

export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

export type SwapDirection = "buy" | "sell";

const swapParams = parseAbiParameters("(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,uint256 minHopPriceX36,bytes hookData");
const currencyAmount = parseAbiParameters("address currency,uint256 amount");
const planParams = parseAbiParameters("bytes actions,bytes[] params");

export const V4_SWAP = "0x10" as Hex;
export const PERMIT2_PERMIT_ALLOW_REVERT = "0x8a" as Hex;

export function quoteIsFresh(quotedAt: bigint, currentTimestamp: bigint, maximumAge = 120n): boolean {
  return currentTimestamp >= quotedAt && currentTimestamp <= quotedAt + maximumAge;
}

export function transactionDeadline(currentTimestamp: bigint, lifetime = 300n): bigint {
  if (lifetime <= 0n || lifetime > 3_600n) throw new Error("Invalid transaction lifetime");
  return currentTimestamp + lifetime;
}

export function minimumOutput(quoted: bigint, slippageBps: number): bigint {
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 5_000) throw new Error("Invalid slippage");
  return quoted * BigInt(10_000 - slippageBps) / 10_000n;
}

export function buildSwapPlan(poolKey: PoolKey, direction: SwapDirection, amountIn: bigint, amountOutMinimum: bigint): Hex {
  if (amountIn <= 0n || amountIn > (1n << 128n) - 1n) throw new Error("Invalid exact input amount");
  const zeroForOne = direction === "buy";
  const input = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const output = zeroForOne ? poolKey.currency1 : poolKey.currency0;
  const actions = concat(["0x06", "0x0c", "0x0f"]);
  const params: Hex[] = [
    encodeAbiParameters(swapParams, [poolKey, zeroForOne, amountIn, amountOutMinimum, 0n, "0x"]),
    encodeAbiParameters(currencyAmount, [input, amountIn]),
    encodeAbiParameters(currencyAmount, [output, amountOutMinimum]),
  ];
  return encodeAbiParameters(planParams, [actions, params]);
}

export function routerCommands(direction: SwapDirection): Hex {
  return direction === "buy" ? V4_SWAP : concat([PERMIT2_PERMIT_ALLOW_REVERT, V4_SWAP]);
}

export function describeSwapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("rejected") || normalized.includes("denied") || normalized.includes("cancel")) return "The wallet request was cancelled.";
  if (normalized.includes("permit2allowanceisfixedatinfinity")) return "POTATO requires one infinite token approval to Permit2; each signed swap authorization remains exact and short-lived.";
  if (normalized.includes("allowance") || normalized.includes("permit")) return "The POTATO Permit2 authorization is missing, expired, or was not accepted.";
  if (normalized.includes("slippage") || normalized.includes("minimum") || normalized.includes("too little")) return "The pool moved beyond your minimum received amount. Refresh the quote.";
  if (normalized.includes("insufficient")) return "Your wallet balance is too low for this swap and its gas.";
  if (normalized.includes("deadline") || normalized.includes("expired")) return "This quote expired. Refresh it before swapping.";
  if (normalized.includes("external") || normalized.includes("buy")) return "External POTATO buys are not currently enabled.";
  return "The swap could not be completed. Refresh the live quote and try again.";
}
