"use client";

import { formatUnits } from "viem";
import { useBalance } from "wagmi";

import { robinhoodTestnet } from "@/lib/burntato/chain";
import { useWalletState } from "@/providers/wallet-context";

/** Read-only Robinhood testnet ETH balance for the active wallet. */
export function NetworkEthBalance() {
  const { configured, activeAddress, status } = useWalletState();

  if (!configured || !activeAddress || status !== "ready") {
    return <span className="balance-value">— ETH</span>;
  }

  return <NetworkEthBalanceReadout address={activeAddress} />;
}

function NetworkEthBalanceReadout({ address }: { address: string }) {
  const { data, isPending, isError } = useBalance({
    address: address as `0x${string}`,
    chainId: robinhoodTestnet.id,
    query: { refetchInterval: 30_000 },
  });

  if (isError) return <span className="balance-value is-unavailable">Unavailable</span>;
  if (isPending || !data) {
    return <span className="balance-value is-loading" aria-label="Reading ETH balance">…</span>;
  }

  const formatted = Number(formatUnits(data.value, data.decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
  return <span className="balance-value">{formatted} ETH</span>;
}
