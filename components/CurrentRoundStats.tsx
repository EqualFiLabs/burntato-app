"use client";

import { Coins, Flame, Gauge, Sprout, Timer, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import {
  countdownSeconds,
  formatCountdown,
  formatEth,
  formatPotato,
  projectGrabPrices,
  remainingRoundEmissions,
  type BurntatoRound,
  type RoundConfig,
  type RoundPhase,
} from "../lib/burntato/model";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function RoundCountdown({ deadline, anchor }: { deadline: bigint; anchor: bigint }) {
  const [now, setNow] = useState(anchor);

  useEffect(() => {
    const interval = window.setInterval(() => setNow((current) => current + 1n), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return <>{formatCountdown(countdownSeconds(deadline, now))}</>;
}

export type CurrentRoundStatsProps = {
  currentRoundId: bigint;
  round: BurntatoRound | null;
  protocolConfig: RoundConfig | null;
  phase: RoundPhase;
  currentEmission: readonly [bigint, bigint];
  recoveryCommitment: bigint;
  genesisWinnerReserve: bigint;
  genesisTreasuryBudget: bigint;
  chainNow: bigint;
};

export function CurrentRoundStats({
  currentRoundId,
  round,
  protocolConfig,
  phase,
  currentEmission,
  recoveryCommitment,
  genesisWinnerReserve,
  genesisTreasuryBudget,
  chainNow,
}: CurrentRoundStatsProps) {
  const isGenesisPending = currentRoundId === 0n;
  const displayRoundId = isGenesisPending ? 1n : currentRoundId;
  const config = round?.config ?? protocolConfig;
  const firstPrice = round?.nextPrice ?? config?.startingPrice ?? 0n;
  const purchaseIndex = round?.purchaseIndex ?? 0n;
  const priceIncreaseBps = config?.priceIncreaseBps ?? 0;
  const prices = projectGrabPrices(firstPrice, priceIncreaseBps);
  const emissions = round
    ? remainingRoundEmissions(round, currentEmission)
    : {
        baseAvailable: protocolConfig?.roundEmissionBudget ?? 0n,
        treasuryAvailable: genesisTreasuryBudget,
        totalAvailable: (protocolConfig?.roundEmissionBudget ?? 0n) + genesisTreasuryBudget,
        holderAccrued: 0n,
        holderAccruedFinalized: false,
      };
  const winnerPot = round?.winnerPool ?? genesisWinnerReserve;
  const recoveryPool = round?.recoveryPool ?? 0n;
  const holder = round?.currentHolder;
  const hasHolder = Boolean(holder && holder.toLowerCase() !== ZERO_ADDRESS);
  const isClosed = phase === "expired" || phase === "settled";
  const statusLabel = phase === "open" ? "Open" : phase === "expired" ? "Expired" : phase === "settled" ? "Settled" : "Ready";

  return (
    <main className="screen-content round-screen">
      <div className="round-dashboard">
        <header className="round-dashboard-header">
          <div>
            <span className="round-eyebrow"><Flame aria-hidden="true" /> Current round</span>
            <h1>Round <strong>#{displayRoundId.toString()}</strong></h1>
            <p>Live economics for the round in play.</p>
          </div>
          <div className={`round-status is-${phase}`}>
            <span>{statusLabel}</span>
            <strong>
              {phase === "open" && round
                ? <RoundCountdown key={chainNow.toString()} deadline={round.deadline} anchor={chainNow} />
                : phase === "unstarted" ? "Waiting for first Grab" : phase === "expired" ? "Settlement ready" : "Complete"}
            </strong>
          </div>
        </header>

        <section className="round-summary-grid" aria-label="Current round balances">
          <article className="round-summary-card is-winner">
            <span className="round-summary-icon"><Coins aria-hidden="true" /></span>
            <div><small>Winner pot</small><strong>{formatEth(winnerPot)} ETH</strong><p>Paid to the final holder</p></div>
          </article>
          <article className="round-summary-card">
            <span className="round-summary-icon"><Gauge aria-hidden="true" /></span>
            <div><small>Recovery pool</small><strong>{formatEth(recoveryPool)} ETH</strong><p>Allocated in this round</p></div>
          </article>
          <article className="round-summary-card">
            <span className="round-summary-icon"><Flame aria-hidden="true" /></span>
            <div><small>Recovery POTATO</small><strong>{formatPotato(recoveryCommitment)}</strong><p>Committed to this round</p></div>
          </article>
          <article className="round-summary-card">
            <span className="round-summary-icon"><Sprout aria-hidden="true" /></span>
            <div><small>Emissions available</small><strong>{formatPotato(emissions.totalAvailable)}</strong><p>POTATO remaining after current accrual</p></div>
          </article>
        </section>

        <div className="round-detail-grid">
          <section className="round-panel upcoming-grabs" aria-labelledby="upcoming-grabs-heading">
            <div className="round-panel-heading">
              <span><Timer aria-hidden="true" /></span>
              <div><h2 id="upcoming-grabs-heading">Upcoming Grabs</h2><p>{priceIncreaseBps / 100}% increase per Grab</p></div>
            </div>
            {isClosed ? (
              <div className="round-closed-message">
                <Flame aria-hidden="true" />
                <div><strong>Purchases are closed</strong><span>{phase === "expired" ? "Settle this round from Play before another Grab." : "This round has been settled."}</span></div>
              </div>
            ) : (
              <ol className="grab-price-list">
                {prices.map((price, index) => (
                  <li key={`${price}-${index}`}>
                    <span><small>{index === 0 ? "Next" : "Projected"}</small><strong>Grab #{(purchaseIndex + BigInt(index) + 1n).toString()}</strong></span>
                    <b>{formatEth(price)} ETH</b>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="round-panel emissions-panel" aria-labelledby="emissions-heading">
            <div className="round-panel-heading">
              <span><Sprout aria-hidden="true" /></span>
              <div><h2 id="emissions-heading">Emission runway</h2><p>Current round POTATO budget</p></div>
            </div>
            <dl className="round-breakdown">
              <div><dt>Base available</dt><dd>{formatPotato(emissions.baseAvailable)} POTATO</dd></div>
              <div><dt>Treasury bonus available</dt><dd>{formatPotato(emissions.treasuryAvailable)} POTATO</dd></div>
              <div><dt>{emissions.holderAccruedFinalized ? "Current holder earned (finalized)" : "Current holder accrued"}</dt><dd>{formatPotato(emissions.holderAccrued)} POTATO</dd></div>
            </dl>
          </section>
        </div>

        <footer className="round-holder-strip">
          <span className="round-holder-icon"><UserRound aria-hidden="true" /></span>
          <div><small>Current holder</small><strong title={hasHolder ? holder : undefined}>{hasHolder && holder ? shortAddress(holder) : "Waiting for first Grab"}</strong></div>
          <div><small>Purchases</small><strong>{purchaseIndex.toString()}</strong></div>
        </footer>
      </div>
    </main>
  );
}
