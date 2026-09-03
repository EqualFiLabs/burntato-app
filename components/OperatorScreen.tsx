"use client";

import { BadgeCheck, Coins, ExternalLink, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits, type Address } from "viem";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { activationUpgradeCost, faucetEligibility, operatorRewardAction, parseOperatorId, ZERO_ADDRESS } from "@/lib/operators/model";
import { useBurntatoState } from "@/providers/burntato-context";
import { type OperatorAction, useOperatorState } from "@/providers/operator-context";
import { useWalletState } from "@/providers/wallet-context";

function statics(value: bigint): string {
  return Number(formatUnits(value, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function eth(value: bigint): string {
  return Number(formatEther(value)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function pending(operator: ReturnType<typeof useOperatorState>, action: OperatorAction): boolean {
  const stage = operator.transactions[action]?.stage;
  return stage === "wallet" || stage === "confirming";
}

function actionLabel(operator: ReturnType<typeof useOperatorState>, action: OperatorAction, idle: string): string {
  const stage = operator.transactions[action]?.stage;
  if (stage === "wallet") return "Confirm in wallet…";
  if (stage === "confirming") return "Confirming…";
  return idle;
}

function explorer(address: string): string {
  return `${BURNTATO_DEPLOYMENT.explorer}/address/${address}`;
}

export function OperatorScreen() {
  const wallet = useWalletState();
  const game = useBurntatoState();
  const operator = useOperatorState();
  const setOperatorId = operator.setOperatorId;
  const [tokenInput, setTokenInput] = useState("");
  const [selectedTargetTier, setSelectedTargetTier] = useState(1);
  const parsedId = useMemo(() => parseOperatorId(tokenInput), [tokenInput]);
  const account = wallet.activeAddress?.toLowerCase();
  const ownsToken = Boolean(account && operator.tokenOwner?.toLowerCase() === account);
  const registeredOwner = operator.routerRegistration.owner.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
  const targetTier = selectedTargetTier <= operator.currentTier
    ? Math.min(4, operator.currentTier + 1)
    : selectedTargetTier;
  const upgradeCost = activationUpgradeCost(operator.tierCosts, operator.currentTier, targetTier);
  const { ready: faucetReady, funded: faucetFunded } = faucetEligibility(operator.chainNow, operator.faucetNextClaimAt, operator.faucetBalance, operator.faucetClaimAmount);
  const purchaseApproved = operator.purchaseAllowance >= operator.purchaseQuote.staticsPrice;
  const activationApproved = operator.activationAllowance >= upgradeCost;
  const purchaseNativeFunded = operator.nativeBalance >= operator.purchaseQuote.requiredNative;
  const rewardsAction = operatorRewardAction(wallet.activeAddress as Address | null, operator.routerRegistration, operator.routerPreview);

  useEffect(() => {
    setOperatorId(parsedId);
  }, [parsedId, setOperatorId]);

  let readinessAction: { label: string; action: () => void; disabled: boolean } | null = null;
  if (wallet.status === "unconfigured") {
    readinessAction = { label: "Wallet sign-in unavailable", action: () => undefined, disabled: true };
  } else if (wallet.status !== "ready") {
    readinessAction = { label: wallet.busyAction === "login" ? "Signing in…" : "Sign in to continue", action: wallet.login, disabled: wallet.busyAction !== null };
  } else if (!operator.correctNetwork) {
    readinessAction = { label: "Switch to Robinhood testnet", action: game.switchToRobinhood, disabled: game.networkSwitchBlocked };
  }

  return (
    <main className="screen-content operator-screen">
      <section className="operator-hero">
        <p>Genesis Operators</p>
        <h1>Own the game&apos;s revenue rail</h1>
        <span>Registered Operators share 15% of direct game purchases and 40% of the pool&apos;s 1% swap fee.</span>
      </section>

      <div className="operator-content">
        <div className="operator-contracts" aria-label="Verified deployment contracts">
          <a href={explorer(BURNTATO_DEPLOYMENT.operatorNft)} target="_blank" rel="noopener noreferrer">Operator NFT <ExternalLink aria-hidden="true" /></a>
          <a href={explorer(BURNTATO_DEPLOYMENT.operatorRewardsRouter)} target="_blank" rel="noopener noreferrer">Rewards router <ExternalLink aria-hidden="true" /></a>
        </div>

        {readinessAction && (
          <button className="primary-action operator-readiness" type="button" disabled={readinessAction.disabled} onClick={readinessAction.action}>
            <WalletCards aria-hidden="true" /><span>{readinessAction.label}</span>
          </button>
        )}

        <section className="operator-card" aria-labelledby="operator-funding-title">
          <div className="operator-card-heading">
            <Coins aria-hidden="true" />
            <div><small>Step 1</small><h2 id="operator-funding-title">Fund your wallet</h2></div>
          </div>
          <dl className="operator-metrics">
            <div><dt>Wallet STATICS</dt><dd>{statics(operator.staticsBalance)}</dd></div>
            <div><dt>Faucet inventory</dt><dd>{statics(operator.faucetBalance)}</dd></div>
            <div><dt>Claim bundle</dt><dd>{statics(operator.faucetClaimAmount)}</dd></div>
          </dl>
          <p className={faucetFunded ? "operator-callout" : "operator-callout is-danger"}>
            {faucetFunded
              ? faucetReady ? "This wallet is eligible for the 200,000 STATICS testnet bundle." : `Cooldown active until ${new Date(Number(operator.faucetNextClaimAt) * 1_000).toLocaleString()}.`
              : "Faucet underfunded. The launch operator must refill it before another tester can onboard."}
          </p>
          <button
            className="operator-action"
            type="button"
            disabled={Boolean(readinessAction) || !faucetReady || !faucetFunded || pending(operator, "faucet")}
            onClick={() => void operator.claimFaucet()}
          >
            {actionLabel(operator, "faucet", "Claim 200,000 STATICS")}
          </button>
          <p className="operator-help">You also need Robinhood testnet ETH for gas and the live Genesis native fee. No official public faucet is currently documented; obtain test ETH from the testnet coordinator.</p>
        </section>

        <section className="operator-card" aria-labelledby="operator-purchase-title">
          <div className="operator-card-heading">
            <BadgeCheck aria-hidden="true" />
            <div><small>Step 2</small><h2 id="operator-purchase-title">Choose an Operator</h2></div>
          </div>
          <label className="operator-token-field">
            <span>Operator token ID (1–5,555)</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={tokenInput}
              placeholder="e.g. 42"
              aria-invalid={tokenInput.length > 0 && parsedId === null}
              onChange={(event) => setTokenInput(event.target.value)}
            />
          </label>
          {tokenInput && parsedId === null && <p className="operator-inline-error">Enter a whole-number token ID from 1 through 5,555.</p>}
          {parsedId !== null && (
            <>
              <dl className="operator-metrics">
                <div><dt>Current owner</dt><dd title={operator.tokenOwner ?? undefined}>{operator.tokenInVault ? "Genesis Vault" : ownsToken ? "Your wallet" : operator.tokenOwner ? `${operator.tokenOwner.slice(0, 6)}…${operator.tokenOwner.slice(-4)}` : "Unavailable"}</dd></div>
                <div><dt>STATICS price</dt><dd>{statics(operator.purchaseQuote.staticsPrice)}</dd></div>
                <div><dt>Native required</dt><dd>{eth(operator.purchaseQuote.requiredNative)} ETH</dd></div>
                <div><dt>Wallet ETH</dt><dd>{eth(operator.nativeBalance)} ETH</dd></div>
              </dl>
              {!purchaseNativeFunded && <p className="operator-inline-error">The active wallet needs more Robinhood testnet ETH for the live purchase fee and gas.</p>}
              {operator.tokenInVault ? (
                <div className="operator-sequence">
                  <button
                    className="operator-action"
                    type="button"
                    disabled={Boolean(readinessAction) || purchaseApproved || operator.staticsBalance < operator.purchaseQuote.staticsPrice || pending(operator, "approve-purchase")}
                    onClick={() => void operator.approvePurchase()}
                  >
                    {purchaseApproved ? "STATICS purchase approved" : actionLabel(operator, "approve-purchase", "1. Approve exact STATICS")}
                  </button>
                  <button
                    className="operator-action is-primary"
                    type="button"
                    disabled={Boolean(readinessAction) || !purchaseApproved || !purchaseNativeFunded || operator.purchasesPaused || !operator.vaultFinalized || pending(operator, "purchase")}
                    onClick={() => void operator.purchase()}
                  >
                    {actionLabel(operator, "purchase", `2. Buy Operator #${parsedId}`)}
                  </button>
                </div>
              ) : ownsToken ? (
                <p className="operator-callout is-success">Operator #{parsedId.toString()} is owned by the active wallet.</p>
              ) : (
                <p className="operator-callout is-danger">This Operator is already owned by another wallet. Choose a Vault-held token ID.</p>
              )}
            </>
          )}
        </section>

        {parsedId !== null && ownsToken && (
          <>
            <section className="operator-card" aria-labelledby="operator-activation-title">
              <div className="operator-card-heading"><ShieldCheck aria-hidden="true" /><div><small>Step 3</small><h2 id="operator-activation-title">Activation weight</h2></div></div>
              <dl className="operator-metrics">
                <div><dt>Current tier</dt><dd>{operator.currentTier}</dd></div>
                <div><dt>Current weight</dt><dd>{(operator.multiplierBps / 100).toFixed(0)}%</dd></div>
                <div><dt>Remaining STATICS</dt><dd>{statics(operator.staticsBalance - (upgradeCost > operator.staticsBalance ? operator.staticsBalance : upgradeCost))}</dd></div>
              </dl>
              <label className="operator-token-field">
                <span>Raise to tier</span>
                <select value={targetTier} onChange={(event) => setSelectedTargetTier(Number(event.target.value))}>
                  {[1, 2, 3, 4].filter((tier) => tier > operator.currentTier).map((tier) => (
                    <option key={tier} value={tier}>Tier {tier} · {statics(activationUpgradeCost(operator.tierCosts, operator.currentTier, tier))} STATICS</option>
                  ))}
                </select>
              </label>
              {operator.currentTier < 4 ? (
                <div className="operator-sequence">
                  <button className="operator-action" type="button" disabled={Boolean(readinessAction) || activationApproved || upgradeCost === 0n || operator.staticsBalance < upgradeCost || pending(operator, "approve-activation")} onClick={() => void operator.approveActivation(upgradeCost)}>
                    {activationApproved ? "Activation approved" : actionLabel(operator, "approve-activation", `1. Approve ${statics(upgradeCost)} STATICS`)}
                  </button>
                  <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || !activationApproved || upgradeCost === 0n || pending(operator, "activate")} onClick={() => void operator.activate(targetTier)}>
                    {actionLabel(operator, "activate", `2. Activate tier ${targetTier}`)}
                  </button>
                </div>
              ) : <p className="operator-callout is-success">Maximum activation tier reached.</p>}
            </section>

            <section className="operator-card" aria-labelledby="operator-rewards-title">
              <div className="operator-card-heading"><Coins aria-hidden="true" /><div><small>Step 4</small><h2 id="operator-rewards-title">Burntato Operator rewards</h2></div></div>
              <dl className="operator-metrics">
                <div><dt>Stored weight</dt><dd>{operator.routerRegistration.weight ? `${operator.routerRegistration.weight / 100}%` : "Not registered"}</dd></div>
                <div><dt>Claimable</dt><dd>{eth(operator.routerPreview.claimable)} ETH</dd></div>
                <div><dt>Router pending</dt><dd>{eth(operator.pendingRouterRevenue)} ETH</dd></div>
              </dl>
              {operator.routerPreview.transferDetected && <p className="operator-callout is-danger">Transfer or weight decrease detected. Sync invalidates this registration and forfeits {eth(operator.routerPreview.forfeitable)} ETH for redistribution.</p>}
              {rewardsAction === "register" ? (
                <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || pending(operator, "register-burntato")} onClick={() => void operator.registerBurntato()}>{actionLabel(operator, "register-burntato", registeredOwner ? "Invalidate old state and register" : "Register with Burntato")}</button>
              ) : rewardsAction === "sync" ? (
                <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || pending(operator, "sync-burntato")} onClick={() => void operator.syncBurntato()}>{actionLabel(operator, "sync-burntato", "Sync increased activation weight")}</button>
              ) : (
                <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || operator.routerPreview.claimable === 0n || pending(operator, "claim-burntato")} onClick={() => void operator.claimBurntato()}>{actionLabel(operator, "claim-burntato", "Claim Operator ETH")}</button>
              )}
              <p className="operator-transfer-warning">Do not transfer a registered Operator. Any owner change or activation-weight decrease invalidates it; unpaid revenue goes to the other valid Operators, or Treasury if none remain. Activation increases are safe after syncing.</p>
            </section>

            <section className="operator-card" aria-labelledby="operator-launch-title">
              <div className="operator-card-heading"><RefreshCw aria-hidden="true" /><div><small>Optional launch rail</small><h2 id="operator-launch-title">Genesis Launch rewards</h2></div></div>
              <dl className="operator-metrics">
                <div><dt>Status</dt><dd>{operator.launchFinalized ? "Finalized" : "Active"}</dd></div>
                <div><dt>STATICS pending</dt><dd>{statics(operator.launchStaticsPending)}</dd></div>
                <div><dt>Numeraire pending</dt><dd>{statics(operator.launchNativePending)}</dd></div>
              </dl>
              {!operator.launchRegistered && !operator.launchFinalized ? (
                <button className="operator-action" type="button" disabled={Boolean(readinessAction) || pending(operator, "register-launch")} onClick={() => void operator.registerLaunch()}>{actionLabel(operator, "register-launch", "Register for Genesis Launch rewards")}</button>
              ) : operator.launchRegistered ? (
                <div className="operator-sequence">
                  <button className="operator-action" type="button" disabled={operator.launchStaticsPending === 0n || pending(operator, "claim-launch-statics")} onClick={() => void operator.claimLaunch("statics")}>{actionLabel(operator, "claim-launch-statics", "Claim STATICS rewards")}</button>
                  <button className="operator-action" type="button" disabled={operator.launchNativePending === 0n || pending(operator, "claim-launch-native")} onClick={() => void operator.claimLaunch("native")}>{actionLabel(operator, "claim-launch-native", "Claim numeraire rewards")}</button>
                </div>
              ) : <p className="operator-callout">The standalone launch rail is finalized; new registration is closed.</p>}
            </section>
          </>
        )}

        {operator.error && <p className="operator-inline-error" role="alert">{operator.error}</p>}
        {operator.loading && <p className="operator-sync" role="status">Refreshing onchain Operator state…</p>}
      </div>
    </main>
  );
}
