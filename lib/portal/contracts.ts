import { parseAbi } from "viem";

export const v4QuoterAbi = parseAbi([
  "function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)",
]);

export const universalRouterAbi = parseAbi([
  "function execute(bytes commands,bytes[] inputs,uint256 deadline) payable",
  "error ExecutionFailed(uint256 commandIndex,bytes message)",
]);

export const permit2Abi = parseAbi([
  "function allowance(address owner,address token,address spender) view returns (uint160 amount,uint48 expiration,uint48 nonce)",
]);

export const hookAbi = parseAbi([
  "function externalBuysEnabled() view returns (bool)",
  "function feeBps() view returns (uint16)",
  "function operatorRewardShareBps() view returns (uint16)",
]);
