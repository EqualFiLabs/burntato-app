"use client";

import { createContext, useContext } from "react";

export type WalletStatus =
  | "unconfigured"
  | "loading"
  | "signed-out"
  | "ready"
  | "wallet-missing"
  | "error";

export type WalletKind = "embedded" | "external";

/** Wallet action currently in flight, used to block duplicate clicks. */
export type WalletAction = "login" | "logout" | "connect-external" | "select" | null;

export type EvmWalletSummary = {
  address: string;
  kind: WalletKind;
  label: string;
};

export type WalletState = {
  configured: boolean;
  status: WalletStatus;
  authenticated: boolean;
  evmWallets: readonly EvmWalletSummary[];
  activeAddress: string | null;
  activeWalletKind: WalletKind | null;
  activeWalletLabel: string | null;
  /** Robinhood testnet block-explorer URL for the active address, or null. */
  explorerUrl: string | null;
  busyAction: WalletAction;
  /** Human-readable wallet feedback. Never contains provider internals. */
  error: string | null;
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
  activeAddress: null,
  activeWalletKind: null,
  activeWalletLabel: null,
  explorerUrl: null,
  busyAction: null,
  error: null,
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
