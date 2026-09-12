import { getAddress, parseAbi, type Address } from "viem";

const ROBINHOOD_TESTNET_DEPLOYMENT = {
  network: "Robinhood Chain Testnet",
  chainId: 46_630,
  deploymentId: "robinhood-testnet-46630-low-cost",
  explorer: "https://explorer.testnet.chain.robinhood.com",
  diamond: "0x5e59B7d841199cD4316b0a081d6530fc7Ae4F28F" as Address,
  deploymentBlock: 113_055_786n,
  sourceCommit: "1e3a49389baffd1aaff9c3bafbdf55e68d489200",
  operatorRewardsRouter: "0xd4F279C7DfA2756aF90933ac4632D61eBA7eEFF6" as Address,
  hook: "0xe699242c924449e2CbD88919ED419Eb82f85A444" as Address,
  poolId: "0xd2363660c269c9f06a7991a421e8fbd2f621d5030e03d56bb2e4938f917afe88" as `0x${string}`,
  statics: "0xcDe1F22F70DB6C42c7C0050e6F3B53d03a2006eD" as Address,
  operatorNft: "0x8BB2E39abAE7346293Ff084fd4D104b064BEbC71" as Address,
  operatorNftDeploymentBlock: 112_330_669n,
  activationRegistry: "0xcE4D413915B4C6dE7DfD486d233596Da35c5cFbD" as Address,
  genesisVault: "0xa5Cb1f90C70310Af1E5466DdFBB57f3F2353Ef58" as Address,
  genesisLaunchDistributor: "0xfE07863397a331b35B9D1fB5Ea14130eB870bA06" as Address,
  faucet: "0xd2e561B46a2de6713F53d954C0415447100d2955" as Address,
  staticsPoolId: "0xf31e4b5ca452b221f9fb5f3aff4b1b0c178e37cf179db73fe521ef59a55ae625" as `0x${string}`,
  weth: "0x33e4191705c386532ba27cBF171Db86919200B94" as Address,
  poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951" as Address,
  quoter: "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94" as Address,
  universalRouter: "0x8876789976dEcBfCbBbe364623C63652db8C0904" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
} as const;

type PublicDeploymentEnvironment = {
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
  "error Reentrancy()",
  "error RoundAlreadySettled()",
  "error RoundExpired()",
  "error RoundNotExpired()",
  "error UnauthorizedWinner(address account)",
  "error VestingIncomplete()",
  "error ZeroAmount()",
]);
