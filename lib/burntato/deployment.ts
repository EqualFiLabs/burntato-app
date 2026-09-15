import { getAddress, type Address } from "viem";

import robinhoodTestnetManifest from "../../deployments/robinhood-testnet.json";

const addressFields = [
  "diamond",
  "operatorRewardsRouter",
  "hook",
  "statics",
  "operatorNft",
  "activationRegistry",
  "genesisVault",
  "genesisLaunchDistributor",
  "faucet",
  "weth",
  "poolManager",
  "quoter",
  "universalRouter",
  "permit2",
] as const;

const bytes32Fields = ["poolId", "staticsPoolId"] as const;

export type DeploymentManifest = {
  network: string;
  chainId: number;
  deploymentId: string;
  explorer: string;
  diamond: Address;
  deploymentBlock: bigint;
  sourceCommit: string;
  operatorRewardsRouter: Address;
  hook: Address;
  poolId: `0x${string}`;
  statics: Address;
  operatorNft: Address;
  operatorNftDeploymentBlock: bigint;
  activationRegistry: Address;
  genesisVault: Address;
  genesisLaunchDistributor: Address;
  faucet: Address;
  staticsPoolId: `0x${string}`;
  weth: Address;
  poolManager: Address;
  quoter: Address;
  universalRouter: Address;
  permit2: Address;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Burntato deployment manifest must be a JSON object");
  return value as Record<string, unknown>;
}

function requiredString(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Burntato deployment manifest field ${field} must be a non-empty string`);
  return value.trim();
}

function nonNegativeInteger(source: Record<string, unknown>, field: string): bigint {
  const value = source[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`Burntato deployment manifest field ${field} must be a non-negative safe integer`);
  return BigInt(value);
}

export function deploymentFromManifest(value: unknown): DeploymentManifest {
  const source = record(value);
  const chainId = Number(source.chainId);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("Burntato deployment manifest field chainId must be a positive safe integer");
  const sourceCommit = requiredString(source, "sourceCommit");
  if (!/^[0-9a-f]{7,40}$/i.test(sourceCommit)) throw new Error("Burntato deployment manifest field sourceCommit must be a Git commit hash");
  const explorer = typeof source.explorer === "string" ? source.explorer.trim() : "";
  if (explorer && !/^https?:\/\//i.test(explorer)) throw new Error("Burntato deployment manifest field explorer must be an HTTP(S) URL");

  const addresses = Object.fromEntries(addressFields.map((field) => {
    try {
      return [field, getAddress(requiredString(source, field))];
    } catch {
      throw new Error(`Burntato deployment manifest field ${field} must be a valid EVM address`);
    }
  })) as Record<(typeof addressFields)[number], Address>;

  const bytes32 = Object.fromEntries(bytes32Fields.map((field) => {
    const item = requiredString(source, field);
    if (!/^0x[0-9a-fA-F]{64}$/.test(item)) throw new Error(`Burntato deployment manifest field ${field} must be bytes32`);
    return [field, item.toLowerCase() as `0x${string}`];
  })) as Record<(typeof bytes32Fields)[number], `0x${string}`>;

  return {
    network: requiredString(source, "network"),
    chainId,
    deploymentId: requiredString(source, "deploymentId"),
    explorer,
    ...addresses,
    ...bytes32,
    deploymentBlock: nonNegativeInteger(source, "deploymentBlock"),
    operatorNftDeploymentBlock: nonNegativeInteger(source, "operatorNftDeploymentBlock"),
    sourceCommit,
  };
}

export function deploymentFromJson(value: string): DeploymentManifest {
  try {
    return deploymentFromManifest(JSON.parse(value));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Burntato deployment override must be valid JSON");
    throw error;
  }
}

export const ROBINHOOD_TESTNET_DEPLOYMENT = deploymentFromManifest(robinhoodTestnetManifest);
