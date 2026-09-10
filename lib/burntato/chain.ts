import { defineChain } from "viem";

import { BURNTATO_DEPLOYMENT } from "./contract";

export function createBurntatoChain(rpcUrl: string) {
  const explorer = BURNTATO_DEPLOYMENT.explorer;
  return defineChain({
    id: BURNTATO_DEPLOYMENT.chainId,
    name: BURNTATO_DEPLOYMENT.network,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    ...(explorer ? {
      blockExplorers: {
        default: { name: `${BURNTATO_DEPLOYMENT.network} Explorer`, url: explorer },
      },
    } : {}),
    testnet: BURNTATO_DEPLOYMENT.chainId !== 4_663,
  });
}
