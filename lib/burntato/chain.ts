import { defineChain } from "viem";

import { BURNTATO_DEPLOYMENT } from "./contract";

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

export function createBurntatoChain(rpcUrl: string) {
  const explorer = BURNTATO_DEPLOYMENT.explorer;
  return defineChain({
    id: BURNTATO_DEPLOYMENT.chainId,
    name: BURNTATO_DEPLOYMENT.network,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    contracts: { multicall3: { address: MULTICALL3_ADDRESS } },
    ...(explorer ? {
      blockExplorers: {
        default: { name: `${BURNTATO_DEPLOYMENT.network} Explorer`, url: explorer },
      },
    } : {}),
    testnet: BURNTATO_DEPLOYMENT.chainId !== 4_663,
  });
}
