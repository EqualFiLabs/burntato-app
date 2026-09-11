import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "error InsufficientBalance()",
  "error InsufficientAllowance()",
  "error InvalidPermit()",
  "error PermitExpired()",
  "error Permit2AllowanceIsFixedAtInfinity()",
  "error ERC20InsufficientBalance(address sender,uint256 balance,uint256 needed)",
  "error ERC20InsufficientAllowance(address spender,uint256 allowance,uint256 needed)",
  "error ERC20InvalidReceiver(address receiver)",
  "error ERC20InvalidSpender(address spender)",
]);

export const faucetAbi = parseAbi([
  "function CLAIM_AMOUNT() view returns (uint256)",
  "function COOLDOWN() view returns (uint256)",
  "function nextClaimAt(address account) view returns (uint256)",
  "function claim()",
  "event Claimed(address indexed account, uint64 claimedAt, uint256 amount)",
  "error ClaimNotReady(uint256 nextClaimAt)",
  "error FaucetUnderfunded(uint256 available, uint256 required)",
]);

export const operatorNftAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function launchFinalized() view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "error ERC721NonexistentToken(uint256 tokenId)",
  "error ERC721IncorrectOwner(address sender,uint256 tokenId,address owner)",
  "error ERC721InvalidReceiver(address receiver)",
  "error ERC721InsufficientApproval(address operator,uint256 tokenId)",
]);

export const genesisVaultAbi = parseAbi([
  "struct GenesisPurchaseQuote { uint256 staticsPrice; uint256 reserveBuyIn; uint256 nativeFee; uint256 requiredNative; bool epochActive; }",
  "function quoteGenesisPurchase() view returns (GenesisPurchaseQuote quote)",
  "function purchasesPaused() view returns (bool)",
  "function finalized() view returns (bool)",
  "function isVaultInventory(uint256 tokenId) view returns (bool)",
  "function buyGenesis(uint256 tokenId, address receiver) payable",
  "event GenesisPurchased(address indexed payer,address indexed receiver,uint256 indexed tokenId,uint256 staticsPaid,uint256 reserveBuyIn,uint256 nativeFee)",
  "error GenesisNotInVault(uint256 tokenId)",
  "error InsufficientNative(uint256 provided, uint256 required)",
  "error PurchasesPaused()",
  "error VaultInventoryEmpty()",
]);

export const activationRegistryAbi = parseAbi([
  "function tierOf(uint256 genesisId) view returns (uint8)",
  "function multiplierBps(uint256 genesisId) view returns (uint16)",
  "function tierCost(uint8 tier) view returns (uint256)",
  "function activate(uint256 genesisId, uint8 targetTier) returns (uint256 paid)",
  "event GenesisActivated(uint256 indexed genesisId,uint8 previousTier,uint8 newTier,uint256 staticsPaid)",
  "event GenesisActivationReset(uint256 indexed genesisId,address indexed previousOwner,address indexed nextOwner)",
  "error NotGenesisOwner(uint256 genesisId,address caller,address owner)",
  "error InvalidTier(uint8 tier)",
  "error ActivationTierNotIncreased(uint8 currentTier,uint8 targetTier)",
]);

export const operatorRewardsAbi = parseAbi([
  "struct Registration { address owner; uint16 weight; uint256 rewardIndex; uint256 claimable; uint256 rewardRemainder; }",
  "function register(uint256 operatorId)",
  "function sync(uint256 operatorId) returns (uint8 result)",
  "function claim(uint256 operatorId,address receiver) returns (uint256 amount)",
  "function claimBatch(uint256[] operatorIds,address receiver) returns (uint256 amount)",
  "function registrationOf(uint256 operatorId) view returns (Registration registration)",
  "function previewRewards(uint256 operatorId) view returns (address currentOwner,uint16 currentWeight,bool transferDetected,uint256 claimable,uint256 forfeitable,uint256 rewardRemainder)",
  "function totalRegisteredWeight() view returns (uint256)",
  "function pendingRevenue() view returns (uint256)",
  "function totalReceived() view returns (uint256)",
  "event OperatorRegistered(uint256 indexed operatorId,address indexed owner,uint16 weight)",
  "event OperatorWeightUpdated(uint256 indexed operatorId,uint16 previousWeight,uint16 newWeight)",
  "event OperatorInvalidated(uint256 indexed operatorId,address indexed storedOwner,address indexed currentOwner,uint16 storedWeight,uint16 currentWeight,uint256 forfeited,uint256 forfeitedRemainder)",
  "event OperatorRewardClaimed(uint256 indexed operatorId,address indexed owner,address indexed receiver,uint256 amount)",
  "error InvalidOperatorOwner(uint256 operatorId,address caller,address owner)",
  "error OperatorAlreadyRegistered(uint256 operatorId)",
  "error OperatorNotRegistered(uint256 operatorId)",
  "error EmptyOperatorBatch()",
  "error InvalidOperatorOrder(uint256 previousOperatorId,uint256 operatorId)",
]);

export const genesisDistributorAbi = parseAbi([
  "function statics() view returns (address)",
  "function numeraire() view returns (address)",
  "function finalized() view returns (bool)",
  "function registered(uint256 genesisId) view returns (bool)",
  "function effectiveWeight(uint256 genesisId) view returns (uint256)",
  "function totalWeight() view returns (uint256)",
  "function pendingGenesis(uint256 genesisId,address asset) view returns (uint256 amount)",
  "function registerGenesis(uint256 genesisId)",
  "function claimGenesis(uint256 genesisId,address asset,address receiver) returns (uint256 amount)",
  "event GenesisRegistered(uint256 indexed genesisId,uint256 weight,uint256 totalWeight)",
  "event GenesisWeightChanged(uint256 indexed genesisId,uint256 previousWeight,uint256 newWeight,uint256 totalWeight)",
  "event GenesisRewardsClaimed(uint256 indexed genesisId,address indexed owner,address indexed asset,address receiver,uint256 amount)",
  "error GenesisAlreadyRegistered(uint256 genesisId)",
  "error GenesisHeldByVault(uint256 genesisId)",
  "error NotGenesisOwner(uint256 genesisId,address caller,address owner)",
  "error LaunchRewardsAlreadyFinalized()",
]);
