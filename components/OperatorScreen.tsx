"use client";

import { BadgeCheck, ExternalLink, WalletCards } from "lucide-react";
import { type Address } from "viem";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { formatEth } from "@/lib/burntato/model";
import { operatorRewardAction, ZERO_ADDRESS } from "@/lib/operators/model";
import { useBurntatoState } from "@/providers/burntato-context";
import { type OperatorAction, useOperatorState } from "@/providers/operator-context";
import { useWalletState } from "@/providers/wallet-context";

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
    readinessAction = { label: `Switch to ${BURNTATO_DEPLOYMENT.network}`, action: game.switchToRobinhood, disabled: game.networkSwitchBlocked };
  }

  const selected = operator.operatorId !== null;
  const registerBatchPending = pending(operator, "register-burntato-batch");
  const syncBatchPending = pending(operator, "sync-burntato-batch");
  const claimBatchPending = pending(operator, "claim-burntato-batch");
  const actionPending = pending(operator, "register-burntato")
    || registerBatchPending
    || pending(operator, "sync-burntato")
    || syncBatchPending
    || pending(operator, "claim-burntato")
    || claimBatchPending;
  const hasBatchAction = operator.batchRegisterOperatorIds.length > 0
    || operator.batchSyncOperatorIds.length > 0
    || operator.batchClaimOperatorIds.length > 0;
  const operatorLabel = (count: number) => `Operator${count === 1 ? "" : "s"}`;

  return (
    <main className="screen-content operator-screen">
      <div className="operator-backdrop" aria-hidden="true" />
      <div className="operator-controls">
        <section className="operator-hub" aria-labelledby="operator-title">
          <div className="operator-heading">
            <span className="operator-heading-icon"><BadgeCheck aria-hidden="true" /></span>
            <div>
              <p>Earn from every Grab</p>
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

              {operator.ownedOperatorIds.length > 1 && hasBatchAction && (
                <div className="operator-batch-actions" aria-label="All Operator actions">
                  {operator.batchRegisterOperatorIds.length > 0 && (
                    <div className="operator-batch-action">
                      <span><small>Ready to earn</small><strong>{operator.batchRegisterOperatorIds.length} {operatorLabel(operator.batchRegisterOperatorIds.length)}</strong></span>
                      <button
                        className="operator-action is-primary"
                        type="button"
                        disabled={Boolean(readinessAction) || actionPending || operator.loading}
                        onClick={() => void operator.registerAllBurntato()}
                      >
                        {actionLabel(operator, "register-burntato-batch", `Register ${operator.batchRegisterOperatorIds.length}`)}
                      </button>
                    </div>
                  )}
                  {operator.batchSyncOperatorIds.length > 0 && (
                    <div className="operator-batch-action">
                      <span><small>Higher activation weight</small><strong>{operator.batchSyncOperatorIds.length} {operatorLabel(operator.batchSyncOperatorIds.length)}</strong></span>
                      <button
                        className="operator-action is-primary"
                        type="button"
                        disabled={Boolean(readinessAction) || actionPending || operator.loading}
                        onClick={() => void operator.syncAllBurntato()}
                      >
                        {actionLabel(operator, "sync-burntato-batch", `Update ${operator.batchSyncOperatorIds.length}`)}
                      </button>
                    </div>
                  )}
                  {operator.batchClaimOperatorIds.length > 0 && (
                    <div className="operator-batch-action">
                      <span><small>All claimable rewards</small><strong>{formatEth(operator.batchClaimable)} ETH</strong></span>
                      <button
                        className="operator-action is-primary"
                        type="button"
                        disabled={Boolean(readinessAction) || actionPending || operator.loading || operator.batchClaimable === 0n}
                        onClick={() => void operator.claimAllBurntato()}
                      >
                        {actionLabel(operator, "claim-burntato-batch", `Claim ${operator.batchClaimOperatorIds.length}`)}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selected && (
                <>
                  <dl className="operator-metrics" aria-label="Selected Operator rewards">
                    <div><dt>Current weight</dt><dd>{operator.routerPreview.currentWeight ? `${operator.routerPreview.currentWeight / 100}%` : "—"}</dd></div>
                    <div><dt>Registered</dt><dd>{operator.routerRegistration.weight ? `${operator.routerRegistration.weight / 100}%` : "No"}</dd></div>
                    <div><dt>Claimable</dt><dd>{formatEth(operator.routerPreview.claimable)} ETH</dd></div>
                  </dl>

                  {operator.routerPreview.transferDetected && (
                    <p className="operator-inline-error">This Operator changed owners or lost activation weight. Register it again to continue. Unclaimed rewards from the previous registration will be shared with other Operators.</p>
                  )}

                  {rewardsAction === "register" ? (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading} onClick={() => void operator.registerBurntato()}>
                      {actionLabel(operator, "register-burntato", registeredOwner ? "Register current ownership" : "Register for rewards")}
                    </button>
                  ) : rewardsAction === "sync" ? (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading} onClick={() => void operator.syncBurntato()}>
                      {actionLabel(operator, "sync-burntato", "Update reward weight")}
                    </button>
                  ) : (
                    <button className="operator-action is-primary" type="button" disabled={Boolean(readinessAction) || actionPending || operator.loading || operator.routerPreview.claimable === 0n} onClick={() => void operator.claimBurntato()}>
                      {actionLabel(operator, "claim-burntato", "Claim Operator ETH")}
                    </button>
                  )}

                </>
              )}
            </>
          )}

          {operator.error && <p className="operator-inline-error" role="alert">{operator.error}</p>}
          {selected && operator.loading && <p className="operator-sync" role="status">Updating rewards…</p>}

          {BURNTATO_DEPLOYMENT.explorer && (
            <a className="operator-contract-link" href={`${BURNTATO_DEPLOYMENT.explorer}/address/${BURNTATO_DEPLOYMENT.operatorRewardsRouter}`} target="_blank" rel="noopener noreferrer">
              View rewards contract <ExternalLink aria-hidden="true" />
            </a>
          )}
        </section>
      </div>
    </main>
  );
}
