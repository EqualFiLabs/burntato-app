"use client";

import { CalendarDays, Check, Flame, Gift, Link as LinkIcon, Lock, Share2, Trophy } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { formatEth } from "@/lib/burntato/model";
import { parseSponsorship, roundFundingBreakdown, roundSharePath } from "@/lib/burntato/sponsorship";
import { useBurntatoState, type TransactionAction } from "@/providers/burntato-context";
import { useWalletState } from "@/providers/wallet-context";

function shareUrl(roundId: bigint): string {
  return new URL(roundSharePath(roundId), window.location.origin).toString();
}

function UpcomingRoundCard({
  roundId,
  winnerReserve,
  recoveryReserve,
  winnerSponsored,
  recoverySponsored,
  fundingBreakdownAvailable,
  currentRoundId,
  focused,
}: {
  roundId: bigint;
  winnerReserve: bigint;
  recoveryReserve: bigint;
  winnerSponsored: bigint;
  recoverySponsored: bigint;
  fundingBreakdownAvailable: boolean;
  currentRoundId: bigint;
  focused: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { totalLocked, communitySponsored, protocolFunded } = roundFundingBreakdown({
    winnerReserve,
    recoveryReserve,
    winnerSponsored,
    recoverySponsored,
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl(roundId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Browser permission failures leave the button ready to retry.
    }
  }

  function shareOnX() {
    const source = fundingBreakdownAvailable
      ? ` ${formatEth(communitySponsored)} ETH was community sponsored.`
      : "";
    const text = `Round #${roundId.toString()} of Burntato has ${formatEth(totalLocked)} ETH locked onchain: ${formatEth(winnerReserve)} ETH for the winner and ${formatEth(recoveryReserve)} ETH in Recovery.${source} The pots may keep growing.`;
    window.open(`https://x.com/intent/post?${new URLSearchParams({ text, url: shareUrl(roundId) })}`, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={focused ? "sponsored-round-card is-focused" : "sponsored-round-card"}>
      <div className="sponsored-round-heading">
        <span><CalendarDays aria-hidden="true" /></span>
        <div>
          <small>{roundId === currentRoundId + 1n ? "Next round" : "Upcoming round"}</small>
          <h2>Round #{roundId.toString()}</h2>
        </div>
        <em><Lock aria-hidden="true" /> Locked so far</em>
      </div>
      <div className="sponsored-round-pots">
        <div>
          <Trophy aria-hidden="true" />
          <span><small>Winner pot</small><strong>{formatEth(winnerReserve)} ETH</strong></span>
        </div>
        <div>
          <Flame aria-hidden="true" />
          <span><small>Recovery pot</small><strong>{formatEth(recoveryReserve)} ETH</strong></span>
        </div>
      </div>
      <div className="sponsored-round-total">
        <span>Total locked</span>
        <strong>{formatEth(totalLocked)} ETH</strong>
      </div>
      {fundingBreakdownAvailable ? (
        <div className="round-funding-sources">
          <span><small>Community sponsored</small><strong>{formatEth(communitySponsored)} ETH</strong></span>
          <span><small>Protocol/game funded</small><strong>{formatEth(protocolFunded)} ETH</strong></span>
        </div>
      ) : (
        <p className="round-funding-unavailable">Funding source breakdown is unavailable on this deployment.</p>
      )}
      <p>These onchain amounts are locked for Round #{roundId.toString()} and may increase before it begins.</p>
      <div className="sponsored-round-share">
        <button type="button" onClick={() => void copyLink()}>
          {copied ? <Check aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <button type="button" onClick={shareOnX}><Share2 aria-hidden="true" /> Share on X</button>
      </div>
    </article>
  );
}

export type InitialUpcomingRoundFunding = {
  roundId: string;
  winnerReserve: string;
  recoveryReserve: string;
  winnerSponsored: string;
  recoverySponsored: string;
  fundingBreakdownAvailable: boolean;
};

export function UpcomingRounds({
  focusRoundId,
  initialRoundFunding,
}: {
  focusRoundId?: string;
  initialRoundFunding?: InitialUpcomingRoundFunding;
}) {
  const game = useBurntatoState();
  const wallet = useWalletState();
  const requestedRound = useMemo(() => {
    if (!focusRoundId || !/^[1-9]\d*$/.test(focusRoundId)) return null;
    return BigInt(focusRoundId);
  }, [focusRoundId]);
  const defaultTarget = requestedRound && requestedRound > game.currentRoundId
    ? requestedRound
    : game.currentRoundId + 1n;
  const [editedRoundValue, setEditedRoundValue] = useState<string | null>(null);
  const [winnerValue, setWinnerValue] = useState("");
  const [recoveryValue, setRecoveryValue] = useState("");
  const roundValue = editedRoundValue ?? defaultTarget.toString();

  const parsed = parseSponsorship(roundValue, winnerValue, recoveryValue, game.currentRoundId);
  const displayRounds = useMemo(() => {
    if (
      !requestedRound
      || requestedRound <= game.currentRoundId
      || game.upcomingRounds.some(({ roundId }) => roundId === requestedRound)
      || initialRoundFunding?.roundId !== requestedRound.toString()
    ) {
      return game.upcomingRounds;
    }
    const initial = {
      roundId: requestedRound,
      winnerReserve: BigInt(initialRoundFunding.winnerReserve),
      recoveryReserve: BigInt(initialRoundFunding.recoveryReserve),
      winnerSponsored: BigInt(initialRoundFunding.winnerSponsored),
      recoverySponsored: BigInt(initialRoundFunding.recoverySponsored),
      fundingBreakdownAvailable: initialRoundFunding.fundingBreakdownAvailable,
    };
    return [...game.upcomingRounds, initial].sort((left, right) => left.roundId < right.roundId ? -1 : 1);
  }, [game.currentRoundId, game.upcomingRounds, initialRoundFunding, requestedRound]);
  const action = `sponsor-${parsed?.roundId ?? roundValue}` as TransactionAction;
  const transaction = game.transactions[action];
  const pending = transaction?.stage === "wallet" || transaction?.stage === "confirming";
  const invalidTarget = roundValue.trim().length > 0 && (!/^[1-9]\d*$/.test(roundValue.trim()) || BigInt(roundValue.trim()) <= game.currentRoundId);
  const invalidAmounts = (winnerValue.trim().length > 0 && parseSponsorship(roundValue, winnerValue, recoveryValue || "0", game.currentRoundId) === null)
    || (recoveryValue.trim().length > 0 && parseSponsorship(roundValue, winnerValue || "0", recoveryValue, game.currentRoundId) === null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed || pending) return;
    if (wallet.status !== "ready") {
      wallet.login();
      return;
    }
    if (!game.correctNetwork) {
      game.switchToRobinhood();
      return;
    }
    void game.fundRound(parsed.roundId, parsed.winnerAmount, parsed.recoveryAmount);
  }

  let actionLabel = `Fund ${parsed ? formatEth(parsed.total) : "0"} ETH`;
  if (wallet.status === "unconfigured") actionLabel = "Wallet sign-in unavailable";
  else if (wallet.status !== "ready") actionLabel = wallet.busyAction === "login" ? "Signing in…" : "Sign in to fund";
  else if (!game.correctNetwork) actionLabel = "Switch to Robinhood";
  else if (transaction?.stage === "wallet") actionLabel = "Confirm in wallet…";
  else if (transaction?.stage === "confirming") actionLabel = "Confirming…";

  return (
    <main className="screen-content upcoming-screen">
      <div className="upcoming-dashboard">
        <header className="upcoming-header">
          <span className="upcoming-header-icon"><Gift aria-hidden="true" /></span>
          <div>
            <p>Upcoming rounds</p>
            <h1>Upcoming Pots</h1>
            <span>Fund a future round now, then share the locked onchain pots before the game begins.</span>
          </div>
        </header>

        {requestedRound !== null && requestedRound <= game.currentRoundId && (
          <section className="sponsorship-unavailable is-stale">
            <CalendarDays aria-hidden="true" />
            <div><strong>Round #{requestedRound.toString()} is no longer upcoming.</strong><span>Choose a later round to add sponsorship.</span></div>
          </section>
        )}

        {!game.sponsorshipAvailable ? (
          <section className="sponsorship-unavailable">
            <Lock aria-hidden="true" />
            <div><strong>Future-round funding is not available on this deployment.</strong><span>The rest of Burntato remains available.</span></div>
          </section>
        ) : (
          <div className="upcoming-layout">
            <section className="upcoming-list" aria-label="Upcoming round pots">
              {displayRounds.map((round) => (
                <UpcomingRoundCard
                  key={round.roundId.toString()}
                  {...round}
                  currentRoundId={game.currentRoundId}
                  focused={round.roundId === requestedRound}
                />
              ))}
              {game.upcomingRoundsLoading && displayRounds.length === 0 && (
                <div className="sponsorship-loading">Checking locked onchain pots…</div>
              )}
            </section>

            <form className="sponsorship-form" onSubmit={submit}>
              <div className="sponsorship-form-heading">
                <Gift aria-hidden="true" />
                <div><small>One transaction</small><h2>Fund a future round</h2></div>
              </div>
              <label>
                <span>Round</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={roundValue}
                  onChange={(event) => setEditedRoundValue(event.target.value)}
                  aria-invalid={invalidTarget}
                />
                <small>Must still be after Round #{game.currentRoundId.toString()} when confirmed.</small>
              </label>
              <div className="sponsorship-amounts">
                <label>
                  <span>Winner pot</span>
                  <span className="eth-input"><input inputMode="decimal" placeholder="0.0" value={winnerValue} onChange={(event) => setWinnerValue(event.target.value)} /><em>ETH</em></span>
                </label>
                <label>
                  <span>Recovery pot</span>
                  <span className="eth-input"><input inputMode="decimal" placeholder="0.0" value={recoveryValue} onChange={(event) => setRecoveryValue(event.target.value)} /><em>ETH</em></span>
                </label>
              </div>
              {(invalidTarget || invalidAmounts) && <p className="sponsorship-validation">Enter a future round and valid ETH amounts with up to 18 decimals.</p>}
              <div className="sponsorship-review">
                <span><small>Winner</small><strong>{formatEth(parsed?.winnerAmount ?? 0n)} ETH</strong></span>
                <span><small>Recovery</small><strong>{formatEth(parsed?.recoveryAmount ?? 0n)} ETH</strong></span>
                <span className="is-total"><small>Total</small><strong>{formatEth(parsed?.total ?? 0n)} ETH</strong></span>
              </div>
              <p className="sponsorship-warning"><Lock aria-hidden="true" /> Funding is irreversible and cannot be withdrawn or moved to another round.</p>
              <button
                className="primary-action sponsorship-submit"
                type="submit"
                disabled={wallet.status === "unconfigured" || !parsed || (game.correctNetwork ? game.gameplayTransactionPending : game.networkSwitchBlocked)}
              >
                <Gift aria-hidden="true" />
                <span>{actionLabel}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
