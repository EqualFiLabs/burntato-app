"use client";

import { BadgeCheck, ExternalLink, WalletCards } from "lucide-react";
import { formatEther, type Address } from "viem";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { operatorRewardAction, ZERO_ADDRESS } from "@/lib/operators/model";
import { useBurntatoState } from "@/providers/burntato-context";
import { type OperatorAction, useOperatorState } from "@/providers/operator-context";
import { useWalletState } from "@/providers/wallet-context";

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

export function OperatorScreen() {
  const wallet = useWalletState();
  const game = useBurntatoState();
  const operator = useOperatorState();
  const registeredOwner = operator.routerRegistration.owner.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
  const rewardsAction = operatorRewardAction(wallet.activeAddress as Address | null, operator.routerRegistration, operator.routerPreview);

  let readinessAction: { label: string; action: () => void; disabled: boolean } | null = null;
  if (wallet.status === "unconfigured") {
    readinessAction = { label: "Wallet sign-in unavailable", action: () => undefined, disabled: true };
  } else if (wallet.status !== "ready") {
    readinessAction = { label: wallet.busyAction === "login" ? "Signing in…" : "Sign in to view rewards", action: wallet.login, disabled: wallet.busyAction !== null };
  } else if (!operator.correctNetwork) {
    readinessAction = { label: "Switch to Robinhood testnet", action: game.switchToRobinhood, disabled: game.networkSwitchBlocked };
  }

  const selected = operator.operatorId !== null;
  const actionPending = pending(operator, "register-burntato") || pending(operator, "sync-burntato") || pending(operator, "claim-burntato");

  return (
    <main className="screen-content operator-screen">
      <div className="operator-backdrop" aria-hidden="true" />
      <div className="operator-controls">
        <section className="operator-hub" aria-labelledby="operator-title">
          <div className="operator-heading">
            <span className="operator-heading-icon"><BadgeCheck aria-hidden="true" /></span>
            <div>
              <p>Revenue rail</p>
              <h1 id="operator-title">Operator Rewards</h1>
            </div>
            {wallet.status === "ready" && (
              <span className="operator-count">{operator.ownedOperatorsLoading ? "Loading…" : `${operator.ownedOperatorIds.length} owned`}</span>
            )}
          </div>

          <p className="operator-intro">Operators share 15% of direct game purchases and 40% of the pool&apos;s 1% swap fee.</p>

          {readinessAction && (
            <button className="operator-action is-primary operator-readiness" type="button" disabled={readinessAction.disabled} onClick={readinessAction.action}>
              <WalletCards aria-hidden="true" /><span>{readinessAction.label}</span>
            </button>
          )}

          {wallet.status === "ready" && (
            <>
              <label className="operator-token-field">
                <span>Your Operator</span>
                <select
                  aria-label="Your Operator"
                  disabled={operator.ownedOperatorsLoading || operator.ownedOperatorIds.length === 0}
                  value={operator.operatorId?.toString() ?? ""}
                  onChange={(event) => operator.setOperatorId(event.target.value ? BigInt(event.target.value) : null)}
                >
                  <option value="" disabled>{operator.ownedOperatorsLoading ? "Reading wallet…" : "No Operators found"}</option>
                  {operator.ownedOperatorIds.map((id) => <option key={id.toString()} value={id.toString()}>Operator #{id.toString()}</option>)}
                </select>
              </label>

              {!operator.ownedOperatorsLoading && operator.ownedOperatorIds.length === 0 && (
                <div className="operator-empty"><BadgeCheck aria-hidden="true" /><strong>No Operators found</strong><span>This wallet does not currently own a Statics Operator.</span></div>
              )}

              {selected && (
                <>
                  <dl className="operator-metrics" aria-label="Selected Operator rewards">
                    <div><dt>Current weight</dt><dd>{operator.routerPreview.currentWeight ? `${operator.routerPreview.currentWeight / 100}%` : "—"}</dd></div>
                    <div><dt>Registered</dt><dd>{operator.routerRegistration.weight ? `${operator.routerRegistration.weight / 100}%` : "No"}</dd></div>
                    <div><dt>Claimable</dt><dd>{eth(operator.routerPreview.claimable)} ETH</dd></div>
                  </dl>

                  {operator.routerPreview.transferDetected && (
                    <p className="operator-inline-error">Transfer or weight decrease detected. Registering again invalidates the old state and redistributes its unpaid revenue.</p>
                  )}

                  {rewardsAction === "register" ? (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading} onClick={() => void operator.registerBurntato()}>
                      {actionLabel(operator, "register-burntato", registeredOwner ? "Invalidate old state and register" : "Register for rewards")}
                    </button>
                  ) : rewardsAction === "sync" ? (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading} onClick={() => void operator.syncBurntato()}>
                      {actionLabel(operator, "sync-burntato", "Sync increased weight")}
                    </button>
                  ) : (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading || operator.routerPreview.claimable === 0n} onClick={() => void operator.claimBurntato()}>
                      {actionLabel(operator, "claim-burntato", "Claim Operator ETH")}
                    </button>
                  )}

                  <p className="operator-transfer-warning">Transfers or activation-weight decreases invalidate registration and redistribute unpaid revenue. Weight increases are safe after syncing.</p>
                </>
              )}
            </>
          )}

          {operator.error && <p className="operator-inline-error" role="alert">{operator.error}</p>}
          {selected && operator.loading && <p className="operator-sync" role="status">Refreshing reward state…</p>}

          <a className="operator-contract-link" href={`${BURNTATO_DEPLOYMENT.explorer}/address/${BURNTATO_DEPLOYMENT.operatorRewardsRouter}`} target="_blank" rel="noopener noreferrer">
            Rewards contract <ExternalLink aria-hidden="true" />
          </a>
        </section>
      </div>
    </main>
  );
}
