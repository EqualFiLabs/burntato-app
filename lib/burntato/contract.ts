import { getAddress, parseAbi, type Address } from "viem";

import { deploymentFromJson, ROBINHOOD_TESTNET_DEPLOYMENT } from "./deployment";

export { deploymentFromManifest, deploymentFromJson, ROBINHOOD_TESTNET_DEPLOYMENT } from "./deployment";

type PublicDeploymentEnvironment = {
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_JSON?: string;
  NEXT_PUBLIC_BURNTATO_NETWORK?: string;
  NEXT_PUBLIC_BURNTATO_CHAIN_ID?: string;
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID?: string;
  NEXT_PUBLIC_BURNTATO_EXPLORER_URL?: string;
  NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK?: string;
  NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT?: string;
  NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK?: string;
  NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_WETH_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS?: string;
  NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS?: string;
};

function requiredOverride(value: string | undefined, variableName: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) throw new Error(`${variableName} is required when NEXT_PUBLIC_BURNTATO_CHAIN_ID overrides the default deployment`);
  return trimmed;
}

function parseChainId(value: string | undefined): number {
  const trimmed = value?.trim();
  if (!trimmed) return ROBINHOOD_TESTNET_DEPLOYMENT.chainId;
  if (!/^\d+$/.test(trimmed)) throw new Error("NEXT_PUBLIC_BURNTATO_CHAIN_ID must be a positive integer");
  const chainId = Number(trimmed);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("NEXT_PUBLIC_BURNTATO_CHAIN_ID must be a positive safe integer");
  return chainId;
}

function parseBlock(value: string | undefined, variableName: string): bigint {
  const trimmed = requiredOverride(value, variableName);
  if (!/^\d+$/.test(trimmed)) throw new Error(`${variableName} must be a non-negative integer`);
  return BigInt(trimmed);
}

function parseAddress(value: string | undefined, variableName: string): Address {
  const trimmed = requiredOverride(value, variableName);
  try {
    return getAddress(trimmed);
  } catch {
    throw new Error(`${variableName} must be a valid EVM address`);
  }
}

export function deploymentFromEnvironment(source: PublicDeploymentEnvironment) {
  const jsonOverride = source.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_JSON?.trim();
  if (jsonOverride) return deploymentFromJson(jsonOverride);
  const chainId = parseChainId(source.NEXT_PUBLIC_BURNTATO_CHAIN_ID);
  if (chainId === ROBINHOOD_TESTNET_DEPLOYMENT.chainId) return ROBINHOOD_TESTNET_DEPLOYMENT;

  return {
    ...ROBINHOOD_TESTNET_DEPLOYMENT,
    network: requiredOverride(source.NEXT_PUBLIC_BURNTATO_NETWORK, "NEXT_PUBLIC_BURNTATO_NETWORK"),
    chainId,
    deploymentId: requiredOverride(source.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID, "NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID"),
    explorer: source.NEXT_PUBLIC_BURNTATO_EXPLORER_URL?.trim() ?? "",
    diamond: parseAddress(source.NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS, "NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS"),
    deploymentBlock: parseBlock(source.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK, "NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK"),
    sourceCommit: requiredOverride(source.NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT, "NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT"),
    operatorRewardsRouter: parseAddress(source.NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS, "NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS"),
    hook: parseAddress(source.NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS, "NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS"),
    statics: parseAddress(source.NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS, "NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS"),
    operatorNft: parseAddress(source.NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS, "NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS"),
    operatorNftDeploymentBlock: parseBlock(source.NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK, "NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK"),
    activationRegistry: parseAddress(source.NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS, "NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS"),
    weth: parseAddress(source.NEXT_PUBLIC_BURNTATO_WETH_ADDRESS, "NEXT_PUBLIC_BURNTATO_WETH_ADDRESS"),
    poolManager: parseAddress(source.NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS, "NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS"),
    quoter: parseAddress(source.NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS, "NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS"),
    universalRouter: parseAddress(source.NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS, "NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS"),
    permit2: parseAddress(source.NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS, "NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS"),
  } as const;
}

export const BURNTATO_DEPLOYMENT = deploymentFromEnvironment({
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_JSON: process.env.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_JSON,
  NEXT_PUBLIC_BURNTATO_NETWORK: process.env.NEXT_PUBLIC_BURNTATO_NETWORK,
  NEXT_PUBLIC_BURNTATO_CHAIN_ID: process.env.NEXT_PUBLIC_BURNTATO_CHAIN_ID,
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID: process.env.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_ID,
  NEXT_PUBLIC_BURNTATO_EXPLORER_URL: process.env.NEXT_PUBLIC_BURNTATO_EXPLORER_URL,
  NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_DIAMOND_ADDRESS,
  NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK: process.env.NEXT_PUBLIC_BURNTATO_DEPLOYMENT_BLOCK,
  NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT: process.env.NEXT_PUBLIC_BURNTATO_SOURCE_COMMIT,
  NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_OPERATOR_REWARDS_ROUTER_ADDRESS,
  NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_HOOK_ADDRESS,
  NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_STATICS_ADDRESS,
  NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_ADDRESS,
  NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK: process.env.NEXT_PUBLIC_BURNTATO_OPERATOR_NFT_DEPLOYMENT_BLOCK,
  NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_ACTIVATION_REGISTRY_ADDRESS,
  NEXT_PUBLIC_BURNTATO_WETH_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_WETH_ADDRESS,
  NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_POOL_MANAGER_ADDRESS,
  NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_QUOTER_ADDRESS,
  NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_UNIVERSAL_ROUTER_ADDRESS,
  NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS: process.env.NEXT_PUBLIC_BURNTATO_PERMIT2_ADDRESS,
});

export const burntatoAbi = parseAbi([
  "struct ProtocolConfig { uint256 startingPrice; uint16 priceIncreaseBps; uint256 roundTimeout; uint256 roundEmissionBudget; uint16 emissionStepBps; uint256 emissionVestingDuration; uint16 winnerBps; uint16 nextRoundWinnerBps; uint16 recoveryBps; uint16 treasuryBps; uint16 recoveryBurnBps; uint16 recoveryTreasuryBps; uint16 buybackBps; uint16 operatorPurchaseBps; uint256 roundTimeoutDecay; uint256 minimumRoundTimeout; }",
  "struct RoundConfig { uint256 startingPrice; uint16 priceIncreaseBps; uint256 roundTimeout; uint256 roundEmissionBudget; uint16 emissionStepBps; uint256 emissionVestingDuration; uint16 winnerBps; uint16 nextRoundWinnerBps; uint16 recoveryBps; uint16 treasuryBps; uint16 recoveryBurnBps; uint16 recoveryTreasuryBps; uint16 buybackBps; uint16 operatorPurchaseBps; uint256 roundTimeoutDecay; uint256 minimumRoundTimeout; }",
  "struct Round { uint256 roundId; RoundConfig config; address currentHolder; uint256 holderSince; uint256 deadline; uint64 purchaseIndex; uint256 nextPrice; uint256 holderMaxReward; uint256 holderEarned; uint256 remainingEmission; uint256 emittedPotato; uint256 treasuryEmissionBudget; uint256 holderTreasuryMaxReward; uint256 holderTreasuryEarned; uint256 remainingTreasuryEmission; uint256 treasuryEmittedPotato; uint256 treasuryReleasedPotato; uint256 winnerPool; uint256 recoveryPool; uint256 recoveryCarryIn; uint256 totalCommitted; bool holderEmissionFinalized; bool activated; bool settled; }",
  "function currentRoundId() view returns (uint256)",
  "function protocolConfig() view returns (ProtocolConfig)",
  "function winnerReserveEth() view returns (uint256)",
  "function roundReserves(uint256 roundId) view returns (uint256 winnerEth, uint256 recoveryEth)",
  "function roundFunding(uint256 roundId) view returns (uint256 winnerReserve, uint256 recoveryReserve, uint256 winnerSponsoredEth, uint256 recoverySponsoredEth)",
  "function nextTreasuryRewardBudget() view returns (uint256 roundId, uint256 budget)",
  "function getRound(uint256 roundId) view returns (Round)",
  "function currentEarnedEmission() view returns (uint256 baseEarned, uint256 treasuryEarned)",
  "function canonicalPoolKey() view returns ((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key)",
  "function paused() view returns (bool)",
  "function purchasesInitialized() view returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function buyPotato() payable",
  "function fundRoundReserves(uint256 targetRoundId, uint256 winnerAmount, uint256 recoveryAmount) payable",
  "function materializeMaturedEmission() returns (uint256 baseEarned, uint256 treasuryEarned)",
  "function settleRound()",
  "function commitRecovery(uint256 amount)",
  "function recoveryCommitment(uint256 roundId, address account) view returns (uint256)",
  "function totalRecoveryCommitment(uint256 roundId) view returns (uint256)",
  "function stalledRecoveryWithdrawalAt(uint256 targetRoundId) view returns (uint256 availableAt)",
  "function withdrawStalledRecovery(uint256 targetRoundId) returns (uint256 amount)",
  "function claimWinner(uint256 roundId, address recipient) returns (uint256)",
  "function claimRecovery(uint256 roundId, address recipient) returns (uint256)",
  "function winnerClaimed(uint256 roundId) view returns (bool)",
  "function recoveryClaimed(uint256 roundId, address account) view returns (bool)",
  "function claimableRecovery(uint256 roundId, address account) view returns (uint256)",
  "event RoundStarted(uint256 indexed roundId, uint256 startingPrice, uint256 remainingEmission)",
  "event PotatoPurchased(uint256 indexed roundId, address indexed buyer, uint256 price, uint256 purchaseIndex, uint256 maxReward, uint256 deadline)",
  "event EmissionFinalized(uint256 indexed roundId, address indexed holder, uint256 maxReward, uint256 earned, uint256 heldSeconds)",
  "event TreasuryRewardFinalized(uint256 indexed roundId, address indexed holder, uint256 maxReward, uint256 earned, uint256 heldSeconds)",
  "event RecoveryCommitted(uint256 indexed roundId, address indexed account, uint256 amount, uint256 totalCommitted)",
  "event StalledRecoveryWithdrawn(uint256 indexed targetRoundId, address indexed account, uint256 amount, uint256 remainingCommitment)",
  "event RoundSettled(uint256 indexed roundId, address indexed winner, uint256 winnerPool, uint256 recoveryPool, uint256 totalCommitted, uint256 burnedPotato, uint256 treasuryPotato)",
  "event WinnerClaimed(uint256 indexed roundId, address indexed winner, address indexed recipient, uint256 amount)",
  "event RecoveryClaimed(uint256 indexed roundId, address indexed account, address indexed recipient, uint256 amount)",
  "event WinnerReserveFunded(address indexed funder, uint256 indexed targetRoundId, uint256 amount, uint256 roundReserveEth)",
  "event NextRoundWinnerFunded(uint256 indexed roundId, uint256 indexed targetRoundId, uint256 amount, uint256 roundReserveEth)",
  "event RecoveryReserveFunded(address indexed funder, uint256 indexed targetRoundId, uint256 amount, uint256 roundReserveEth)",
  "error AlreadyClaimed()",
  "error AlreadyFinalized()",
  "error CommitmentClosed(uint256 roundId)",
  "error IncorrectPayment(uint256 expected, uint256 actual)",
  "error InsufficientBalance()",
  "error InvalidAddress()",
  "error InvalidFutureRound(uint256 targetRoundId, uint256 currentRoundId)",
  "error InvalidRound(uint256 roundId)",
  "error NativeTransferFailed()",
  "error NoCurrentHolder()",
  "error NothingToClaim()",
  "error ProtocolPaused()",
  "error PurchasesNotInitialized()",
  "error RecoveryWithdrawalTooSoon(uint256 availableAt)",
  "error RecoveryWithdrawalUnavailable(uint256 roundId)",
  "error Reentrancy()",
  "error RoundAlreadySettled()",
  "error RoundExpired()",
  "error RoundNotExpired()",
  "error UnauthorizedWinner(address account)",
  "error VestingIncomplete()",
  "error NothingToCancel()",
  "error ZeroAmount()",
]);
