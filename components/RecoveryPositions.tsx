import { PieChart, Timer } from "lucide-react";

import {
  formatEth,
  formatPotato,
  projectedRecoveryPayout,
  recoveryPositionShareBps,
} from "../lib/burntato/model";

type RecoveryPositionsProps = {
  currentRoundId: bigint;
  currentRecoveryPool: bigint;
  activeCommitment: bigint;
  activeTotalCommitment: bigint;
  targetRoundId: bigint;
  queuedCommitment: bigint;
  queuedTotalCommitment: bigint;
};

function percentage(commitment: bigint, totalCommitment: bigint): string {
  return `${(Number(recoveryPositionShareBps(commitment, totalCommitment)) / 100).toFixed(2)}%`;
}

export function RecoveryPositions({
  currentRoundId,
  currentRecoveryPool,
  activeCommitment,
  activeTotalCommitment,
  targetRoundId,
  queuedCommitment,
  queuedTotalCommitment,
}: RecoveryPositionsProps) {
  const hasActiveRecovery = activeCommitment > 0n;
  const hasQueuedRecovery = queuedCommitment > 0n;
  const estimatedRecovery = projectedRecoveryPayout(currentRecoveryPool, activeCommitment, activeTotalCommitment);
  const positionCount = Number(hasActiveRecovery) + Number(hasQueuedRecovery);
  const committedAcrossPositions = activeCommitment + queuedCommitment;

  return (
    <div className="reward-list">
      {hasActiveRecovery && <article className="position-row is-detailed">
        <span className="position-status is-live"><span /> Live</span>
        <div className="position-live-content">
          <div className="position-live-heading">
            <span>
              <small>Recovery Market · Round #{currentRoundId.toString()}</small>
              <strong>{formatPotato(activeCommitment)} POTATO committed</strong>
              <em>{formatPotato(activeTotalCommitment)} POTATO total committed</em>
            </span>
          </div>
          <dl className="position-live-metrics">
            <div><dt>Your share</dt><dd>{percentage(activeCommitment, activeTotalCommitment)}</dd></div>
            <div><dt>Recovery pool</dt><dd>{formatEth(currentRecoveryPool)} ETH</dd></div>
            <div><dt>Est. recovery</dt><dd>{formatEth(estimatedRecovery)} ETH</dd></div>
          </dl>
          <p>Pool grows with every Grab</p>
        </div>
      </article>}

      {hasQueuedRecovery && <article className="position-row">
        <span className="position-status is-next"><Timer aria-hidden="true" /> Queued</span>
        <div>
          <small>Recovery Market · Round #{targetRoundId.toString()}</small>
          <strong>{formatPotato(queuedCommitment)} POTATO committed</strong>
          <em>{formatPotato(queuedTotalCommitment)} POTATO total · Pool starts at activation</em>
        </div>
        <span><small>Your share</small><strong>{percentage(queuedCommitment, queuedTotalCommitment)}</strong></span>
      </article>}

      {positionCount === 0 && <div className="onchain-empty"><PieChart aria-hidden="true" /><strong>No recovery positions</strong><span>Your next-round commitment will appear here.</span></div>}

      {positionCount > 0 && <div className="position-note">
        <PieChart aria-hidden="true" />
        <span><strong>{formatPotato(committedAcrossPositions)} POTATO committed</strong><small>Across {positionCount} recovery {positionCount === 1 ? "position" : "positions"}</small></span>
      </div>}
    </div>
  );
}
