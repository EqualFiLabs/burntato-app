import { parseAbiItem, type Address, type PublicClient } from "viem";

import { BURNTATO_DEPLOYMENT } from "../burntato/contract";
import { operatorNftAbi } from "./contracts";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
);

export async function discoverOwnedOperatorIds(
  client: PublicClient,
  account: Address,
): Promise<bigint[]> {
  const logs = await client.getLogs({
    address: BURNTATO_DEPLOYMENT.operatorNft,
    event: transferEvent,
    args: { to: account },
    fromBlock: BURNTATO_DEPLOYMENT.operatorNftDeploymentBlock,
    toBlock: await client.getBlockNumber(),
  });
  const candidates = [
    ...new Set(
      logs
        .map((log) => log.args.tokenId)
        .filter((id): id is bigint => typeof id === "bigint"),
    ),
  ];
  if (candidates.length === 0) return [];
  const owners = await client.multicall({
    contracts: candidates.map((id) => ({
      address: BURNTATO_DEPLOYMENT.operatorNft,
      abi: operatorNftAbi,
      functionName: "ownerOf",
      args: [id],
    })),
  });
  return candidates
    .filter(
      (_, index) =>
        owners[index].status === "success" &&
        (owners[index].result as unknown as Address).toLowerCase() === account.toLowerCase(),
    )
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
