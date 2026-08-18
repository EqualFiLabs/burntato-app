"use client";

import { createContext, useContext } from "react";

export type WalletStatus = "unconfigured" | "loading" | "signed-out" | "ready";

export type WalletKind = "embedded" | "external";

export type EvmWalletSummary = {
  address: string;
  kind: WalletKind;
  label: string;
};

export type SolanaWalletSummary = {
  address: string;
  label: string;
};

export type WalletState = {
  configured: boolean;
  status: WalletStatus;
  authenticated: boolean;
  evmWallets: readonly EvmWalletSummary[];
  solanaWallets: readonly SolanaWalletSummary[];
  activeAddress: string | null;
  activeWalletKind: WalletKind | null;
  activeWalletLabel: string | null;
  login: () => void;
  logout: () => void;
  connectExternalWallet: () => void;
  selectEvmWallet: (address: string) => void;
  copyActiveAddress: () => Promise<boolean>;
};

export const defaultWalletState: WalletState = {
  configured: false,
  status: "unconfigured",
  authenticated: false,
  evmWallets: [],
  solanaWallets: [],
  activeAddress: null,
  activeWalletKind: null,
  activeWalletLabel: null,
  login: () => undefined,
  logout: () => undefined,
  connectExternalWallet: () => undefined,
  selectEvmWallet: () => undefined,
  copyActiveAddress: async () => false,
};

export const WalletContext = createContext<WalletState>(defaultWalletState);

export function useWalletState(): WalletState {
  return useContext(WalletContext);
}
