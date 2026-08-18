"use client";

import { formatUnits } from "viem";
import { mainnet } from "viem/chains";
import { useBalance } from "wagmi";

import { useWalletState } from "@/providers/wallet-context";

/**
 * Read-only Ethereum mainnet ETH balance for the active wallet.
 *
 * A failed read renders as "Unavailable", never as zero — those are different
 * facts. The wagmi readout only mounts when Privy is configured, because the
 * Wagmi provider is mounted only in that case.
 */
export function MainnetEthBalance() {
  const { configured, activeAddress, status } = useWalletState();

  if (!configured || !activeAddress || status !== "ready") {
    return <span className="balance-value">— ETH</span>;
  }

  return <MainnetEthBalanceReadout address={activeAddress} />;
}

function MainnetEthBalanceReadout({ address }: { address: string }) {
  const { data, isPending, isError } = useBalance({
    address: address as `0x${string}`,
    chainId: mainnet.id,
    query: { refetchInterval: 30_000 },
  });

  if (isError) {
    return <span className="balance-value is-unavailable">Unavailable</span>;
  }

  if (isPending || !data) {
    return (
      <span className="balance-value is-loading" aria-label="Reading ETH balance">
        …
      </span>
    );
  }

  const formatted = Number(formatUnits(data.value, data.decimals)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
  return <span className="balance-value">{formatted} ETH</span>;
}
