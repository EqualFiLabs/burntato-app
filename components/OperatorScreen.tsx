"use client";

import { BadgeCheck, ExternalLink, WalletCards } from "lucide-react";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { formatEth } from "@/lib/burntato/model";
import { formatOperatorRewardShare } from "@/lib/operators/model";
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

  let readinessAction: { label: string; action: () => void; disabled: boolean } | null = null;
  if (wallet.status === "unconfigured") {
    readinessAction = { label: "Wallet sign-in unavailable", action: () => undefined, disabled: true };
  } else if (wallet.status !== "ready") {
    readinessAction = { label: wallet.busyAction === "login" ? "Signing in…" : "Sign in to view rewards", action: wallet.login, disabled: wallet.busyAction !== null };
  } else if (!operator.correctNetwork) {
    readinessAction = { label: `Switch to ${BURNTATO_DEPLOYMENT.network}`, action: game.switchToRobinhood, disabled: game.networkSwitchBlocked };
  }

  const registerBatchPending = pending(operator, "register-burntato-batch");
  const syncBatchPending = pending(operator, "sync-burntato-batch");
  const claimBatchPending = pending(operator, "claim-burntato-batch");
  const actionPending = registerBatchPending || syncBatchPending || claimBatchPending;
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
              {!operator.ownedOperatorsLoading && operator.ownedOperatorIds.length === 0 && (
                <div className="operator-empty"><BadgeCheck aria-hidden="true" /><strong>No Operators found</strong><span>This wallet does not currently own a Statics Operator.</span></div>
              )}

              {operator.ownedOperatorIds.length > 0 && (
                <dl className="operator-metrics" aria-label="Wallet Operator rewards">
                  <div><dt>Reward pool share</dt><dd>{formatOperatorRewardShare(operator.walletRegisteredWeight, operator.totalRegisteredWeight)}</dd></div>
                  <div><dt>Total Operators</dt><dd>{operator.totalRegisteredOperators.toLocaleString()}</dd></div>
                  <div><dt>Claimable</dt><dd>{formatEth(operator.batchClaimable)} ETH</dd></div>
                </dl>
              )}

              {operator.ownedOperatorIds.length > 0 && hasBatchAction && (
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
                      <span><small>Ready to claim</small><strong>{operator.batchClaimOperatorIds.length} {operatorLabel(operator.batchClaimOperatorIds.length)}</strong></span>
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
            </>
          )}

          {operator.error && <p className="operator-inline-error" role="alert">{operator.error}</p>}

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
