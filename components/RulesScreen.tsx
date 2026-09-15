"use client";

import { BadgeCheck, BookOpen, Clock3, Coins, Flame, Gauge, Repeat2, Sprout } from "lucide-react";

import { formatEth, formatPotato, type RoundConfig } from "@/lib/burntato/model";
import { useBurntatoState } from "@/providers/burntato-context";

function percent(bps: number): string {
  return `${bps / 100}%`;
}

function duration(seconds: bigint): string {
  if (seconds % 3_600n === 0n) return `${seconds / 3_600n}h`;
  if (seconds % 60n === 0n) return `${seconds / 60n}m`;
  return `${seconds}s`;
}

function RuleValues({ config, currentPrice }: { config: RoundConfig; currentPrice: bigint }) {
  const treasuryShare = config.treasuryBps;

  return (
    <dl className="rules-values">
      <div><dt>Current Grab</dt><dd>{formatEth(currentPrice)} ETH</dd></div>
      <div><dt>Price increase</dt><dd>{percent(config.priceIncreaseBps)} per Grab</dd></div>
      <div><dt>Starting timer</dt><dd>{duration(config.roundTimeout)}</dd></div>
      <div><dt>Timer decay</dt><dd>{duration(config.roundTimeoutDecay)} per Grab</dd></div>
      <div><dt>Minimum timer</dt><dd>{duration(config.minimumRoundTimeout)}</dd></div>
      <div><dt>Round emission</dt><dd>{formatPotato(config.roundEmissionBudget, 0)} POTATO</dd></div>
      <div><dt>Holder opportunity</dt><dd>{percent(config.emissionStepBps)} of remaining</dd></div>
      <div><dt>Full vesting</dt><dd>{duration(config.emissionVestingDuration)}</dd></div>
      <div><dt>Winner pot</dt><dd>{percent(config.winnerBps)}</dd></div>
      <div><dt>Next-round pot</dt><dd>{percent(config.nextRoundWinnerBps)}</dd></div>
      <div><dt>Recovery pool</dt><dd>{percent(config.recoveryBps)}</dd></div>
      <div><dt>Operators</dt><dd>{percent(config.operatorPurchaseBps)}</dd></div>
      <div><dt>Buyback reserve</dt><dd>{percent(config.buybackBps)}</dd></div>
      <div><dt>Treasury</dt><dd>{percent(treasuryShare)}</dd></div>
      <div><dt>Recovery burn</dt><dd>{percent(config.recoveryBurnBps)}</dd></div>
      <div><dt>Recovery Treasury</dt><dd>{percent(config.recoveryTreasuryBps)}</dd></div>
    </dl>
  );
}

export function RulesScreen() {
  const game = useBurntatoState();
  const config = game.currentRound?.config ?? game.protocolConfig;
  const currentPrice = game.currentRound?.nextPrice ?? config?.startingPrice ?? 0n;

  return (
    <main className="screen-content rules-screen">
      <div className="rules-dashboard">
        <header className="rules-heading">
          <span><BookOpen aria-hidden="true" /></span>
          <div><p>How it works</p><h1>Burntato Rules</h1></div>
        </header>

        <section className="rules-intro">
          <Flame aria-hidden="true" />
          <div><h2>Hold the Hot Potato when time runs out</h2><p>Each Grab pays the displayed ETH price, transfers the Hot Potato, resets the timer, and opens a new POTATO emission opportunity.</p></div>
        </section>

        {config ? <RuleValues config={config} currentPrice={currentPrice} /> : <p className="rules-loading">Loading current rules…</p>}

        <div className="rules-grid">
          <article><Clock3 aria-hidden="true" /><div><h2>Grabs and self-grabs</h2><p>The timer gets shorter as the round advances. The current holder may Grab again to defend their position: this finalizes their present emission, spends the current price, resets the timer, starts a new emission opportunity, and increases the next price.</p></div></article>
          <article><Sprout aria-hidden="true" /><div><h2>POTATO emissions</h2><p>POTATO vests with holder time. A new Grab finalizes the previous holder&apos;s earned amount; holding for the full vesting period earns the full opportunity, subject to remaining round emissions.</p></div></article>
          <article><Coins aria-hidden="true" /><div><h2>Winner and future pots</h2><p>The final holder can claim the Winner pot after permissionless settlement. The first Grab of every round funds the next round&apos;s Winner pot. Later Grabs follow the displayed split, and anyone can sponsor future Winner and Recovery pots.</p></div></article>
          <article><Gauge aria-hidden="true" /><div><h2>Recovery Market</h2><p>Commit POTATO for the next round before it begins. After settlement, committed players share its Recovery pool proportionally. Settlement burns the configured share of committed POTATO and routes the remainder to Treasury.</p></div></article>
          <article><BadgeCheck aria-hidden="true" /><div><h2>Operators</h2><p>Registered Statics Operators share game and pool fees according to activation weight. Registration never locks the NFT. You can transfer an Operator without unregistering; its prior registration becomes invalid and the new owner must register it.</p></div></article>
          <article><Repeat2 aria-hidden="true" /><div><h2>Trading and buybacks</h2><p>The Portal trades through Burntato&apos;s canonical POTATO/ETH pool. Protocol buybacks use the accumulated reserve and are executed by operations; they are not a player action in this app.</p></div></article>
        </div>
      </div>
    </main>
  );
}
