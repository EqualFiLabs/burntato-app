import { ponder } from "ponder:registry";
import { indexedEvent } from "ponder:schema";

function json(value: unknown): string {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

function record(source: string, name: string) {
  // Ponder supplies a distinct generated event type for every source; this
  // shared sink intentionally accepts their common runtime shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async ({ event, context }: { event: any; context: any }) => {
    await context.db.insert(indexedEvent).values({
      key: `${event.transaction.hash}:${event.log.logIndex}`,
      source,
      name,
      transactionHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      args: json(event.args),
    });
  };
}

ponder.on("Burntato:PotatoPurchased", record("burntato", "PotatoPurchased"));
ponder.on("Burntato:EmissionFinalized", record("burntato", "EmissionFinalized"));
ponder.on("Burntato:TreasuryRewardFinalized", record("burntato", "TreasuryRewardFinalized"));
ponder.on("Burntato:RecoveryCommitted", record("burntato", "RecoveryCommitted"));
ponder.on("Burntato:StalledRecoveryWithdrawn", record("burntato", "StalledRecoveryWithdrawn"));
ponder.on("Burntato:RoundSettled", record("burntato", "RoundSettled"));
ponder.on("Burntato:WinnerClaimed", record("burntato", "WinnerClaimed"));
ponder.on("Burntato:RecoveryClaimed", record("burntato", "RecoveryClaimed"));
ponder.on("Burntato:WinnerReserveFunded", record("burntato", "WinnerReserveFunded"));
ponder.on("Burntato:NextRoundWinnerFunded", record("burntato", "NextRoundWinnerFunded"));
ponder.on("Burntato:RecoveryReserveFunded", record("burntato", "RecoveryReserveFunded"));

ponder.on("OperatorRouter:OperatorRegistered", record("operator", "OperatorRegistered"));
ponder.on("OperatorRouter:OperatorWeightUpdated", record("operator", "OperatorWeightUpdated"));
ponder.on("OperatorRouter:OperatorInvalidated", record("operator", "OperatorInvalidated"));
ponder.on("OperatorRouter:OperatorRewardClaimed", record("operator", "OperatorRewardClaimed"));
ponder.on("OperatorRouter:RevenueAccrued", record("operator", "RevenueAccrued"));

ponder.on("Faucet:Claimed", record("faucet", "Claimed"));
ponder.on("GenesisVault:GenesisPurchased", record("genesis", "GenesisPurchased"));
ponder.on("OperatorNft:Transfer", record("genesis", "Transfer"));
ponder.on("ActivationRegistry:GenesisActivated", record("genesis", "GenesisActivated"));
ponder.on("ActivationRegistry:GenesisActivationReset", record("genesis", "GenesisActivationReset"));
ponder.on("GenesisDistributor:GenesisRegistered", record("genesis-launch", "GenesisRegistered"));
ponder.on("GenesisDistributor:GenesisWeightChanged", record("genesis-launch", "GenesisWeightChanged"));
ponder.on("GenesisDistributor:GenesisRewardsClaimed", record("genesis-launch", "GenesisRewardsClaimed"));
ponder.on("GenesisDistributor:OwnerRewardsClaimed", record("genesis-launch", "OwnerRewardsClaimed"));
