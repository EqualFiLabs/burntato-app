"use client";

import { formatUnits } from "viem";
import { sepolia } from "viem/chains";
import { useBalance } from "wagmi";

import { useWalletState } from "@/providers/wallet-context";

/**
 * Read-only Ethereum Sepolia ETH balance for the active wallet.
 *
 * A failed read renders as "Unavailable", never as zero — those are different
 * facts. The readout mounts only when Privy has supplied an active wallet.
 */
export function SepoliaEthBalance() {
  const { configured, activeAddress, status } = useWalletState();

  if (!configured || !activeAddress || status !== "ready") {
    return <span className="balance-value">— ETH</span>;
  }

  return <SepoliaEthBalanceReadout address={activeAddress} />;
}

function SepoliaEthBalanceReadout({ address }: { address: string }) {
  const { data, isPending, isError } = useBalance({
    address: address as `0x${string}`,
    chainId: sepolia.id,
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
