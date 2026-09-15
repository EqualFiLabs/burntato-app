import type { RoundPhase } from "./model";

export function requiresSelfGrabConfirmation(
  phase: RoundPhase,
  currentHolder: string | undefined,
  activeAddress: string | null | undefined,
): boolean {
  return phase === "open"
    && Boolean(currentHolder)
    && Boolean(activeAddress)
    && currentHolder?.toLowerCase() === activeAddress?.toLowerCase();
}

export function walletPlacement(addresses: readonly string[], activeAddress: string | null | undefined): number | null {
  if (!activeAddress) return null;
  const index = addresses.findIndex((address) => address.toLowerCase() === activeAddress.toLowerCase());
  return index === -1 ? null : index + 1;
}
