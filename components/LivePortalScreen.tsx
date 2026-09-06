"use client";

import { ArrowDownUp, ArrowLeftRight, Check, Clock3, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  encodeAbiParameters,
  formatEther,
  maxUint256,
  parseAbiParameters,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useSignTypedData, useWriteContract } from "wagmi";

import { burntatoAbi, BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { ScreenHero } from "@/components/ScreenHero";
import { erc20Abi } from "@/lib/operators/contracts";
import { hookAbi, permit2Abi, universalRouterAbi, v4QuoterAbi } from "@/lib/portal/contracts";
import {
  buildSwapPlan,
  describeSwapError,
  minimumOutput,
  quoteIsFresh,
  routerCommands,
  transactionDeadline,
  type PoolKey,
  type SwapDirection,
} from "@/lib/portal/router";
import { useBurntatoState } from "@/providers/burntato-context";
import { useWalletState } from "@/providers/wallet-context";

type Quote = {
  amountIn: bigint;
  amountOut: bigint;
  minimumOut: bigint;
  chainTimestamp: bigint;
};

type PortalTransaction = {
  stage: "wallet" | "signing" | "confirming" | "success" | "error";
  message: string;
  hash?: Hash;
};

const permitSingleParams = parseAbiParameters("((address token,uint160 amount,uint48 expiration,uint48 nonce) details,address spender,uint256 sigDeadline) permitSingle,bytes signature");

function formatted(value: bigint | undefined): string {
  if (value === undefined) return "—";
  return Number(formatEther(value)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function transactionLabel(transaction: PortalTransaction | null, idle: string): string {
  if (!transaction) return idle;
  if (transaction.stage === "wallet") return "Confirm in wallet…";
  if (transaction.stage === "signing") return "Confirm swap permission…";
  if (transaction.stage === "confirming") return "Confirming swap…";
  return idle;
}

export function LivePortalScreen() {
  const wallet = useWalletState();
  const game = useBurntatoState();
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BURNTATO_DEPLOYMENT.chainId });
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const [direction, setDirection] = useState<SwapDirection>("buy");
  const [amount, setAmount] = useState("0.01");
  const [slippageBps, setSlippageBps] = useState(100);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<PortalTransaction | null>(null);
  const transactionLock = useRef(false);
  const account = wallet.activeAddress as Address | null;

  const { data: poolKeyRaw } = useReadContract({
    address: BURNTATO_DEPLOYMENT.diamond,
    abi: burntatoAbi,
    functionName: "canonicalPoolKey",
    chainId: BURNTATO_DEPLOYMENT.chainId,
    query: { refetchInterval: 60_000 },
  });
  const poolKey = poolKeyRaw as PoolKey | undefined;
  const { data: buysEnabled } = useReadContract({
    address: BURNTATO_DEPLOYMENT.hook,
    abi: hookAbi,
    functionName: "externalBuysEnabled",
    chainId: BURNTATO_DEPLOYMENT.chainId,
    query: { refetchInterval: 30_000 },
  });
  const { data: hookFeeBps } = useReadContract({
    address: BURNTATO_DEPLOYMENT.hook,
    abi: hookAbi,
    functionName: "feeBps",
    chainId: BURNTATO_DEPLOYMENT.chainId,
  });
  const { data: operatorFeeShareBps } = useReadContract({
    address: BURNTATO_DEPLOYMENT.hook,
    abi: hookAbi,
    functionName: "operatorRewardShareBps",
    chainId: BURNTATO_DEPLOYMENT.chainId,
  });
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address: account ?? undefined,
    chainId: BURNTATO_DEPLOYMENT.chainId,
    query: { enabled: account !== null, refetchInterval: 20_000 },
  });
  const { data: potatoBalanceRaw, refetch: refetchPotato } = useReadContract({
    address: BURNTATO_DEPLOYMENT.diamond,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: BURNTATO_DEPLOYMENT.chainId,
    query: { enabled: account !== null, refetchInterval: 20_000 },
  });
  const { data: tokenAllowanceRaw, refetch: refetchTokenAllowance } = useReadContract({
    address: BURNTATO_DEPLOYMENT.diamond,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, BURNTATO_DEPLOYMENT.permit2] : undefined,
    chainId: BURNTATO_DEPLOYMENT.chainId,
    query: { enabled: account !== null, refetchInterval: 20_000 },
  });
  const potatoBalance = potatoBalanceRaw as bigint | undefined;
  const tokenAllowance = tokenAllowanceRaw as bigint | undefined;
  let amountIn = 0n;
  try {
    amountIn = parseEther(amount);
  } catch {
    amountIn = 0n;
  }
  const sourceBalance = direction === "buy" ? nativeBalance?.value : potatoBalance;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!publicClient || !poolKey || amountIn <= 0n) {
        setQuote(null);
        setQuoteError(amountIn <= 0n ? "Enter an amount greater than zero." : null);
        return;
      }
      let cancelled = false;
      setQuoteLoading(true);
      setQuoteError(null);
      void Promise.all([
        publicClient.simulateContract({
          address: BURNTATO_DEPLOYMENT.quoter,
          abi: v4QuoterAbi,
          functionName: "quoteExactInputSingle",
          args: [{ poolKey, zeroForOne: direction === "buy", exactAmount: amountIn, hookData: "0x" }],
        }),
        publicClient.getBlock(),
      ])
        .then(([simulation, block]) => {
          if (cancelled) return;
          const [amountOut] = simulation.result;
          setQuote({ amountIn, amountOut, minimumOut: minimumOutput(amountOut, slippageBps), chainTimestamp: block.timestamp });
        })
        .catch((cause) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteError(describeSwapError(cause));
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
      return () => { cancelled = true; };
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [amountIn, direction, poolKey, publicClient, slippageBps]);

  async function approvePotato() {
    if (!publicClient || !account || transactionLock.current) return;
    transactionLock.current = true;
    setTransaction({ stage: "wallet", message: "Approve POTATO in your wallet." });
    try {
      const simulation = await publicClient.simulateContract({
        address: BURNTATO_DEPLOYMENT.diamond,
        abi: erc20Abi,
        functionName: "approve",
        // POTATO intentionally requires its one Permit2 ERC-20 approval to be
        // infinite; the signed per-swap approval below remains exact.
        args: [BURNTATO_DEPLOYMENT.permit2, maxUint256],
        account,
      });
      const hash = await writeContractAsync(simulation.request);
      setTransaction({ stage: "confirming", message: "Confirming POTATO approval…", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Approval reverted");
      setTransaction({ stage: "success", message: "POTATO approved. You can now swap.", hash });
      await refetchTokenAllowance();
    } catch (cause) {
      setTransaction({ stage: "error", message: describeSwapError(cause) });
    } finally {
      transactionLock.current = false;
    }
  }

  async function executeSwap() {
    if (!publicClient || !account || !poolKey || !quote || transactionLock.current) return;
    transactionLock.current = true;
    try {
      const latestBlock = await publicClient.getBlock();
      if (!quoteIsFresh(quote.chainTimestamp, latestBlock.timestamp) || quote.amountIn !== amountIn) throw new Error("Quote deadline expired");
      const deadline = transactionDeadline(latestBlock.timestamp);
      const swapPlan = buildSwapPlan(poolKey, direction, quote.amountIn, quote.minimumOut);
      let inputs: `0x${string}`[] = [swapPlan];
      if (direction === "sell") {
        setTransaction({ stage: "signing", message: "Confirm this POTATO swap in your wallet." });
        const allowance = await publicClient.readContract({
          address: BURNTATO_DEPLOYMENT.permit2,
          abi: permit2Abi,
          functionName: "allowance",
          args: [account, BURNTATO_DEPLOYMENT.diamond, BURNTATO_DEPLOYMENT.universalRouter],
        });
        const expiration = Number(latestBlock.timestamp + 1_200n);
        const sigDeadline = latestBlock.timestamp + 1_200n;
        const permitSingle = {
          details: { token: BURNTATO_DEPLOYMENT.diamond, amount: quote.amountIn, expiration, nonce: allowance[2] },
          spender: BURNTATO_DEPLOYMENT.universalRouter,
          sigDeadline,
        } as const;
        const signature = await signTypedDataAsync({
          domain: { name: "Permit2", chainId: BURNTATO_DEPLOYMENT.chainId, verifyingContract: BURNTATO_DEPLOYMENT.permit2 },
          types: {
            PermitDetails: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint160" },
              { name: "expiration", type: "uint48" },
              { name: "nonce", type: "uint48" },
            ],
            PermitSingle: [
              { name: "details", type: "PermitDetails" },
              { name: "spender", type: "address" },
              { name: "sigDeadline", type: "uint256" },
            ],
          },
          primaryType: "PermitSingle",
          message: permitSingle,
        });
        inputs = [encodeAbiParameters(permitSingleParams, [permitSingle, signature]), swapPlan];
      }
      setTransaction({ stage: "wallet", message: "Confirm the swap in your wallet." });
      const simulation = await publicClient.simulateContract({
        address: BURNTATO_DEPLOYMENT.universalRouter,
        abi: universalRouterAbi,
        functionName: "execute",
        args: [routerCommands(direction), inputs, deadline],
        value: direction === "buy" ? quote.amountIn : 0n,
        account,
      });
      const hash = await writeContractAsync(simulation.request);
      setTransaction({ stage: "confirming", message: "Confirming swap…", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Swap reverted");
      setTransaction({ stage: "success", message: "Swap complete.", hash });
      setQuote(null);
      await Promise.all([refetchNative(), refetchPotato(), refetchTokenAllowance()]);
    } catch (cause) {
      setTransaction({ stage: "error", message: describeSwapError(cause) });
    } finally {
      transactionLock.current = false;
    }
  }

  const needsTokenApproval = direction === "sell" && amountIn > 0n && (tokenAllowance ?? 0n) < amountIn;
  const wrongNetwork = chainId !== BURNTATO_DEPLOYMENT.chainId;
  const insufficientBalance = sourceBalance !== undefined && amountIn > sourceBalance;
  const transactionPending = transaction?.stage === "wallet" || transaction?.stage === "signing" || transaction?.stage === "confirming";
  const swapDisabled = transactionPending || quoteLoading || !quote || insufficientBalance || (direction === "buy" && buysEnabled === false);
  let primaryLabel = transactionLabel(transaction, `Swap ${direction === "buy" ? "ETH for POTATO" : "POTATO for ETH"}`);
  let primaryAction: () => void = () => void executeSwap();
  let primaryDisabled = swapDisabled;
  if (wallet.status !== "ready") {
    primaryLabel = wallet.status === "unconfigured" ? "Wallet sign-in unavailable" : "Sign in to swap";
    primaryAction = wallet.login;
    primaryDisabled = wallet.status === "unconfigured" || wallet.busyAction !== null;
  } else if (wrongNetwork) {
    primaryLabel = "Switch to Robinhood testnet";
    primaryAction = game.switchToRobinhood;
    primaryDisabled = game.networkSwitchBlocked;
  } else if (needsTokenApproval) {
    primaryLabel = transactionLabel(transaction, "Approve POTATO");
    primaryAction = () => void approvePotato();
    primaryDisabled = transactionPending;
  }

  return (
    <main className="screen-content portal-screen live-portal-screen">
      <ScreenHero screen="portal" />
      <div className="portal-controls">
        <section className="portal-hub" aria-labelledby="live-portal-title">
          <div className="portal-heading">
            <span className="portal-heading-icon"><ArrowLeftRight aria-hidden="true" /></span>
            <div><p>Robinhood Chain Testnet</p><h2 id="live-portal-title">ETH ↔ POTATO</h2></div>
          </div>
          <div className="portal-context-row">
            <label><span>Wallet</span><strong>{account ? shortAddress(account) : "Not connected"}</strong></label>
            <label><span>Slippage</span><select value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))}><option value={50}>0.5%</option><option value={100}>1.0%</option><option value={200}>2.0%</option></select></label>
          </div>
          <div className="portal-workspace" role="tabpanel">
            <div className="portal-asset-card">
              <div className="portal-field-label"><span>You pay</span><button type="button" onClick={() => sourceBalance !== undefined && setAmount(formatEther(sourceBalance))}>MAX</button></div>
              <div className="portal-asset-input"><input inputMode="decimal" value={amount} aria-label="Swap amount" onChange={(event) => setAmount(event.target.value)} /><strong>{direction === "buy" ? "ETH" : "POTATO"}</strong></div>
              <small>Balance {formatted(sourceBalance)} {direction === "buy" ? "ETH" : "POTATO"}</small>
            </div>
            <button className="portal-reverse" type="button" aria-label="Reverse swap direction" onClick={() => { setDirection((current) => current === "buy" ? "sell" : "buy"); setQuote(null); }}><ArrowDownUp aria-hidden="true" /></button>
            <div className="portal-asset-card is-output">
              <div className="portal-field-label"><span>You receive</span><em>{quoteLoading ? "Quoting…" : "Quote"}</em></div>
              <div className="portal-asset-input"><strong>{formatted(quote?.amountOut)}</strong><strong>{direction === "buy" ? "POTATO" : "ETH"}</strong></div>
              <small>Minimum {formatted(quote?.minimumOut)} {direction === "buy" ? "POTATO" : "ETH"}</small>
            </div>
            <dl className="portal-quote-grid">
              <div><dt>Pool fee</dt><dd>{hookFeeBps === undefined ? "—" : `${Number(hookFeeBps) / 100}% per swap`}</dd></div>
              <div><dt>Fee split</dt><dd>{operatorFeeShareBps === undefined ? "—" : `${Number(operatorFeeShareBps) / 100}% Operators · ${(10_000 - Number(operatorFeeShareBps)) / 100}% Treasury`}</dd></div>
            </dl>
          </div>
          {insufficientBalance && <p className="portal-live-error">You do not have enough {direction === "buy" ? "ETH" : "POTATO"} for this swap.</p>}
          {quoteError && <p className="portal-live-error">{quoteError}</p>}
          {direction === "buy" && buysEnabled === false && <p className="portal-live-error">Buying POTATO is temporarily unavailable.</p>}
          <button className="primary-action portal-primary-action" type="button" disabled={primaryDisabled} onClick={primaryAction}><WalletCards aria-hidden="true" /><span>{primaryLabel}</span></button>
          {transaction && <div className={`portal-live-status is-${transaction.stage}`} role="status" aria-live="polite"><Check aria-hidden="true" /><span>{transaction.message}</span>{transaction.hash && <a href={`${BURNTATO_DEPLOYMENT.explorer}/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">View transaction</a>}</div>}
          <div className="portal-coming-soon"><Clock3 aria-hidden="true" /><span><strong>Bridge coming soon</strong><small>Base, Arbitrum, and Solana support is coming later.</small></span></div>
        </section>
      </div>
    </main>
  );
}
