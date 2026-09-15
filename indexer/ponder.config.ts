import { createConfig } from "ponder";
import { parseAbi } from "viem";

import { deploymentFromJson, ROBINHOOD_TESTNET_DEPLOYMENT } from "../lib/burntato/deployment";

const deployment = process.env.PONDER_DEPLOYMENT_JSON?.trim()
  ? deploymentFromJson(process.env.PONDER_DEPLOYMENT_JSON)
  : ROBINHOOD_TESTNET_DEPLOYMENT;

const burntatoAbi = parseAbi([
  "event PotatoPurchased(uint256 indexed roundId,address indexed buyer,uint256 price,uint256 purchaseIndex,uint256 maxReward,uint256 deadline)",
  "event EmissionFinalized(uint256 indexed roundId,address indexed holder,uint256 maxReward,uint256 earned,uint256 heldSeconds)",
  "event TreasuryRewardFinalized(uint256 indexed roundId,address indexed holder,uint256 maxReward,uint256 earned,uint256 heldSeconds)",
  "event RecoveryCommitted(uint256 indexed roundId,address indexed account,uint256 amount,uint256 totalCommitted)",
  "event StalledRecoveryWithdrawn(uint256 indexed targetRoundId,address indexed account,uint256 amount,uint256 remainingCommitment)",
  "event RoundSettled(uint256 indexed roundId,address indexed winner,uint256 winnerPool,uint256 recoveryPool,uint256 totalCommitted,uint256 burnedPotato,uint256 treasuryPotato)",
  "event WinnerClaimed(uint256 indexed roundId,address indexed winner,address indexed recipient,uint256 amount)",
  "event RecoveryClaimed(uint256 indexed roundId,address indexed account,address indexed recipient,uint256 amount)",
  "event WinnerReserveFunded(address indexed funder,uint256 indexed targetRoundId,uint256 amount,uint256 roundReserveEth)",
  "event NextRoundWinnerFunded(uint256 indexed roundId,uint256 indexed targetRoundId,uint256 amount,uint256 roundReserveEth)",
  "event RecoveryReserveFunded(address indexed funder,uint256 indexed targetRoundId,uint256 amount,uint256 roundReserveEth)",
]);

const operatorAbi = parseAbi([
  "event OperatorRegistered(uint256 indexed operatorId,address indexed owner,uint16 weight)",
  "event OperatorWeightUpdated(uint256 indexed operatorId,uint16 previousWeight,uint16 newWeight)",
  "event OperatorInvalidated(uint256 indexed operatorId,address indexed storedOwner,address indexed currentOwner,uint16 storedWeight,uint16 currentWeight,uint256 forfeited,uint256 forfeitedRemainder)",
  "event OperatorRewardClaimed(uint256 indexed operatorId,address indexed owner,address indexed receiver,uint256 amount)",
  "event RevenueAccrued(uint256 amount,uint256 totalWeight,uint256 rewardIndex)",
]);

const faucetAbi = parseAbi([
  "event Claimed(address indexed account,uint64 claimedAt,uint256 amount)",
]);

const vaultAbi = parseAbi([
  "event GenesisPurchased(address indexed payer,address indexed receiver,uint256 indexed tokenId,uint256 staticsPaid,uint256 reserveBuyIn,uint256 nativeFee)",
]);

const nftAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
]);

const activationAbi = parseAbi([
  "event GenesisActivated(uint256 indexed genesisId,uint8 previousTier,uint8 newTier,uint256 staticsPaid)",
  "event GenesisActivationReset(uint256 indexed genesisId,address indexed previousOwner,address indexed nextOwner)",
]);

const distributorAbi = parseAbi([
  "event GenesisRegistered(uint256 indexed genesisId,uint256 weight,uint256 totalWeight)",
  "event GenesisWeightChanged(uint256 indexed genesisId,uint256 previousWeight,uint256 newWeight,uint256 totalWeight)",
  "event GenesisRewardsClaimed(uint256 indexed genesisId,address indexed owner,address indexed asset,address receiver,uint256 amount)",
  "event OwnerRewardsClaimed(address indexed owner,address indexed asset,address indexed receiver,uint256 amount)",
]);

function rpc(): string {
  const value = process.env.PONDER_RPC_URL?.trim() || process.env.PONDER_RPC_URL_46630?.trim();
  if (!value) throw new Error("PONDER_RPC_URL is required.");
  return value;
}

export default createConfig({
  ...(process.env.PONDER_DATABASE_DIRECTORY?.trim()
    ? { database: { kind: "pglite" as const, directory: process.env.PONDER_DATABASE_DIRECTORY.trim() } }
    : {}),
  chains: {
    robinhoodTestnet: { id: deployment.chainId, rpc: rpc(), pollingInterval: 2_000 },
  },
  contracts: {
    Burntato: {
      chain: "robinhoodTestnet",
      abi: burntatoAbi,
      address: deployment.diamond,
      startBlock: Number(deployment.deploymentBlock),
    },
    OperatorRouter: {
      chain: "robinhoodTestnet",
      abi: operatorAbi,
      address: deployment.operatorRewardsRouter,
      startBlock: Number(deployment.deploymentBlock),
    },
    Faucet: {
      chain: "robinhoodTestnet",
      abi: faucetAbi,
      address: deployment.faucet,
      startBlock: Number(deployment.operatorNftDeploymentBlock),
    },
    GenesisVault: {
      chain: "robinhoodTestnet",
      abi: vaultAbi,
      address: deployment.genesisVault,
      startBlock: Number(deployment.operatorNftDeploymentBlock),
    },
    OperatorNft: {
      chain: "robinhoodTestnet",
      abi: nftAbi,
      address: deployment.operatorNft,
      startBlock: Number(deployment.operatorNftDeploymentBlock),
    },
    ActivationRegistry: {
      chain: "robinhoodTestnet",
      abi: activationAbi,
      address: deployment.activationRegistry,
      startBlock: Number(deployment.operatorNftDeploymentBlock),
    },
    GenesisDistributor: {
      chain: "robinhoodTestnet",
      abi: distributorAbi,
      address: deployment.genesisLaunchDistributor,
      startBlock: Number(deployment.operatorNftDeploymentBlock),
    },
  },
});
