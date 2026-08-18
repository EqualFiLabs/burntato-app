"use client";

import { getImageProps } from "next/image";
import {
  Check,
  ChevronDown,
  Flame,
  Gift,
  History,
  Home,
  Menu,
  Minus,
  PieChart,
  Plus,
  Timer,
  Trophy,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

type Screen = "grab" | "burn" | "rewards";
type RewardsTab = "ready" | "positions" | "history";

const potatoBalance = 42_690;
const numberFormat = new Intl.NumberFormat("en-US");

const heroSources: Record<Screen, {
  mobile: string;
  desktop: string;
  mobileWidth: number;
  mobileHeight: number;
}> = {
  grab: {
    mobile: "/reference/grab.png",
    desktop: "/scenes/home-desktop.png",
    mobileWidth: 941,
    mobileHeight: 1672,
  },
  burn: {
    mobile: "/reference/burn.png",
    desktop: "/scenes/burn-desktop.png",
    mobileWidth: 941,
    mobileHeight: 1672,
  },
  rewards: {
    mobile: "/scenes/rewards-mobile.png",
    desktop: "/scenes/rewards-desktop.png",
    mobileWidth: 864,
    mobileHeight: 1821,
  },
};

const claimableRewards = [
  {
    id: "winner-127",
    kind: "winner",
    label: "Hot Potato Winner",
    round: 127,
    amount: 0.0125,
    detail: "Final holder reward",
  },
  {
    id: "recovery-126",
    kind: "recovery",
    label: "Recovery Reward",
    round: 126,
    amount: 0.008,
    detail: "Your recovery share",
  },
] as const;

type ClaimableReward = (typeof claimableRewards)[number];
type ClaimableRewardId = ClaimableReward["id"];

function EthereumMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "eth-mark is-small" : "eth-mark"} aria-hidden="true">
      <span className="eth-top" />
      <span className="eth-bottom" />
    </span>
  );
}

function PotatoCoin() {
  return (
    <span className="potato-coin" aria-hidden="true">
      <i />
      <b />
      <em />
    </span>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Burntato">
      <span className="brand-burn">Burn</span>
      <span className="brand-tato">tato</span>
      <span className="brand-sprout" aria-hidden="true">🌱</span>
    </div>
  );
}

function AppHeader({ announce }: { announce: (message: string) => void }) {
  return (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        <button className="balance-pill" type="button" onClick={() => announce("Balance controls will connect in the next phase.")}>
          <EthereumMark small />
          <span>0.125 ETH</span>
          <span className="tiny-plus"><Plus /></span>
        </button>
        <button className="wallet-pill" type="button" onClick={() => announce("Wallet connection is intentionally visual-only.")}>
          <WalletCards aria-hidden="true" />
          <span>0x8f...a7c9</span>
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function Hero({ screen }: { screen: Screen }) {
  const { mobile, desktop, mobileWidth, mobileHeight } = heroSources[screen];
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    src: desktop,
    alt: "",
    width: 1672,
    height: 941,
    quality: 75,
    sizes: "(min-width: 1024px) calc(100vw - 236px), 1px",
  });
  const {
    props: { ...mobileImageProps },
  } = getImageProps({
    src: mobile,
    alt: "",
    width: mobileWidth,
    height: mobileHeight,
    quality: 75,
    sizes: "(max-width: 1023px) min(100vw, 480px), 1px",
    fetchPriority: "high",
    loading: "eager",
  });

  return (
    <div className={`hero hero-${screen}`} aria-label={`Tato artwork for the ${screen} screen`}>
      <picture>
        <source media="(min-width: 1024px)" srcSet={desktopSrcSet} sizes="calc(100vw - 236px)" />
        <img {...mobileImageProps} alt="" className="hero-source" />
      </picture>
      <div className="hero-vignette" />
    </div>
  );
}

const rewardsTabs: { id: RewardsTab; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "positions", label: "Positions" },
  { id: "history", label: "History" },
];

function RewardsScreen({
  claimedRewards,
  onClaim,
}: {
  claimedRewards: ClaimableRewardId[];
  onClaim: (reward: ClaimableReward) => void;
}) {
  const [tab, setTab] = useState<RewardsTab>("ready");
  const claimableEth = claimableRewards.reduce(
    (total, reward) => total + (claimedRewards.includes(reward.id) ? 0 : reward.amount),
    0,
  );
  const readyCount = claimableRewards.length - claimedRewards.length;

  return (
    <main className="screen-content rewards-screen">
      <Hero screen="rewards" />
      <div className="rewards-controls">
        <section className="rewards-hub" aria-labelledby="rewards-title">
          <div className="rewards-heading">
            <span className="rewards-heading-icon"><Gift aria-hidden="true" /></span>
            <div>
              <p>Reward vault</p>
              <h1 id="rewards-title">Your Rewards</h1>
            </div>
            <span className={readyCount ? "ready-badge" : "ready-badge is-clear"}>
              {readyCount ? `${readyCount} ready` : "All claimed"}
            </span>
          </div>

          <div className="rewards-summary" aria-label="Rewards summary">
            <div className="reward-summary-card is-claimable">
              <span className="summary-symbol"><EthereumMark /></span>
              <span>
                <small>Claimable now</small>
                <strong>{claimableEth.toFixed(4)} <em>ETH</em></strong>
              </span>
            </div>
            <div className="reward-summary-card is-earned">
              <PotatoCoin />
              <span>
                <small>Lifetime earned</small>
                <strong>12,450 <em>POTATO</em></strong>
              </span>
            </div>
          </div>

          <div className="rewards-tabs" role="group" aria-label="Reward view">
            {rewardsTabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                className={tab === id ? "is-active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rewards-tab-panel">
            {tab === "ready" && (
              <div className="reward-list">
                {claimableRewards.map((reward) => {
                  const claimed = claimedRewards.includes(reward.id);
                  return (
                    <article className={claimed ? "reward-row is-claimed" : "reward-row"} key={reward.id}>
                      <span className={`reward-type-icon is-${reward.kind}`}>
                        {reward.kind === "winner" ? <Trophy aria-hidden="true" /> : <Gift aria-hidden="true" />}
                      </span>
                      <span className="reward-row-copy">
                        <small>Round #{reward.round}</small>
                        <strong>{reward.label}</strong>
                        <em>{reward.detail}</em>
                      </span>
                      <span className="reward-row-action">
                        <strong>{reward.amount.toFixed(4)} ETH</strong>
                        <button type="button" disabled={claimed} onClick={() => onClaim(reward)}>
                          {claimed ? <><Check aria-hidden="true" /> Claimed</> : "Claim"}
                        </button>
                      </span>
                    </article>
                  );
                })}
                <p className="reward-footnote">Rewards are claimed one round at a time.</p>
              </div>
            )}

            {tab === "positions" && (
              <div className="reward-list">
                <article className="position-row">
                  <span className="position-status is-live"><span /> Earning</span>
                  <div>
                    <small>Recovery Market · Round #128</small>
                    <strong>8,000 POTATO committed</strong>
                  </div>
                  <span><small>Your share</small><strong>6.23%</strong></span>
                </article>
                <article className="position-row">
                  <span className="position-status is-next"><Timer aria-hidden="true" /> Next</span>
                  <div>
                    <small>Recovery Market · Round #129</small>
                    <strong>2,500 POTATO committed</strong>
                  </div>
                  <span><small>Est. share</small><strong>1.84%</strong></span>
                </article>
                <div className="position-note">
                  <PieChart aria-hidden="true" />
                  <span><strong>10,500 POTATO active</strong><small>Across two recovery positions</small></span>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="reward-list">
                <article className="history-row">
                  <span className="history-check"><Check aria-hidden="true" /></span>
                  <span><small>Round #125 · Winner reward</small><strong>0.0100 ETH</strong></span>
                  <em>Claimed</em>
                </article>
                <article className="history-row">
                  <span className="history-check"><Check aria-hidden="true" /></span>
                  <span><small>Round #124 · Recovery reward</small><strong>0.0065 ETH</strong></span>
                  <em>Claimed</em>
                </article>
                <div className="history-total">
                  <History aria-hidden="true" />
                  <span><small>Lifetime ETH claimed</small><strong>0.1485 ETH</strong></span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function GrabScreen({ announce }: { announce: (message: string) => void }) {
  return (
    <main className="screen-content grab-screen">
      <Hero screen="grab" />
      <section className="grab-actions" aria-label="Current Hot Potato round">
        <button className="primary-action grab-button" type="button" onClick={() => announce("Grab Tato is a visual preview—no transaction was sent.")}>
          <Flame aria-hidden="true" />
          <span>Grab Tato</span>
          <Flame aria-hidden="true" />
        </button>
        <div className="round-card timer-card">
          <span className="metric-icon timer-icon"><Timer aria-hidden="true" /></span>
          <div className="metric-copy">
            <span className="metric-label">Time Left in Round</span>
            <strong className="digital-value">01:42:37</strong>
          </div>
        </div>
        <div className="round-card pot-card">
          <span className="metric-icon eth-icon"><EthereumMark /></span>
          <div className="metric-copy">
            <span className="metric-label">Current Pot</span>
            <strong>12.345 ETH</strong>
          </div>
          <span className="coin-stack" aria-hidden="true">
            <span /><span /><span />
          </span>
        </div>
      </section>
    </main>
  );
}

function BurnScreen({ announce }: { announce: (message: string) => void }) {
  const [amount, setAmount] = useState(2_500);
  const yourShare = amount === 0 ? 0 : (amount / (128_400 + amount)) * 100;

  function setPercentage(percent: number) {
    setAmount(Math.round(potatoBalance * percent));
  }

  return (
    <main className="screen-content burn-screen">
      <Hero screen="burn" />
      <div className="burn-controls">
        <section className="burn-panel" aria-label="Commit POTATO to the next Recovery Market round">
          <div className="burn-title-row">
            <span className="title-flame"><Flame aria-hidden="true" /></span>
            <div>
              <h1><span>Burn</span> POTATO</h1>
              <p>Commit to next round</p>
            </div>
            <div className="target-round">
              <span>Target Round</span>
              <strong>#128</strong>
            </div>
          </div>

          <div className="amount-card">
            <div className="available-balance">
              <PotatoCoin />
              <div>
                <span>Available POTATO</span>
                <strong>42,690 POTATO</strong>
              </div>
            </div>
            <div className="amount-stepper">
              <button type="button" aria-label="Decrease amount" onClick={() => setAmount((value) => Math.max(0, value - 100))}>
                <Minus />
              </button>
              <div>
                <strong>{numberFormat.format(amount)}</strong>
                <span>POTATO</span>
              </div>
              <button type="button" aria-label="Increase amount" onClick={() => setAmount((value) => Math.min(potatoBalance, value + 100))}>
                <Plus />
              </button>
            </div>
            <div className="quick-amounts">
              <button type="button" onClick={() => setPercentage(0.25)}>25%</button>
              <button type="button" onClick={() => setPercentage(0.5)}>50%</button>
              <button className={amount === potatoBalance ? "is-selected" : ""} type="button" onClick={() => setPercentage(1)}>Max</button>
            </div>
            <input
              className="amount-range"
              type="range"
              min="0"
              max={potatoBalance}
              step="10"
              value={amount}
              aria-label="POTATO commitment amount"
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </div>
          <button className="primary-action burn-button" type="button" onClick={() => announce(`Visual preview: ${numberFormat.format(amount)} POTATO was not submitted.`)}>
            <Flame aria-hidden="true" />
            <span>Burn POTATO</span>
            <Flame aria-hidden="true" />
          </button>
        </section>
        <section className="burn-stats" aria-label="Recovery Market summary">
          <div className="burn-stat">
            <span className="stat-icon fire"><Flame /></span>
            <span><small>Total Committed</small><strong>128,400</strong><em>POTATO</em></span>
          </div>
          <div className="burn-stat">
            <span className="stat-icon ethereum"><EthereumMark /></span>
            <span><small>Recovery Pool</small><strong>6.75</strong><em>ETH</em></span>
          </div>
          <div className="burn-stat">
            <span className="stat-icon share"><PieChart /></span>
            <span><small>Your Share</small><strong>{yourShare.toFixed(2)}%</strong><em>POTATO</em></span>
          </div>
        </section>
      </div>
    </main>
  );
}

const navigation = [
  { id: "grab", label: "Home", Icon: Home, notice: false },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy, notice: false },
  { id: "burn", label: "Burn", Icon: Flame, notice: false },
  { id: "rewards", label: "Rewards", Icon: Gift, notice: false },
  { id: "more", label: "More", Icon: Menu, notice: false },
] as const;

function BottomNavigation({ screen, select, announce }: { screen: Screen; select: (screen: Screen) => void; announce: (message: string) => void }) {
  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      <div className="sidebar-header">
        <Brand />
        <span>Hot Potato</span>
      </div>
      <div className="nav-items">
        {navigation.map(({ id, label, Icon, notice }) => {
          const active = id === screen;
          return (
            <button
              key={id}
              className={active ? "nav-item is-active" : "nav-item"}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (id === "grab" || id === "burn" || id === "rewards") select(id);
                else announce(`${label} is a visual placeholder in this first pass.`);
              }}
            >
              <span className="nav-icon"><Icon aria-hidden="true" />{notice && <i />}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="sidebar-round" aria-hidden="true">
        <span className="sidebar-round-flame"><Flame /></span>
        <span><small>Live round</small><strong>#127</strong></span>
      </div>
    </nav>
  );
}

export function BurntatoApp() {
  const [screen, setScreen] = useState<Screen>("grab");
  const [notice, setNotice] = useState("");
  const [claimedRewards, setClaimedRewards] = useState<ClaimableRewardId[]>([]);

  function announce(message: string) {
    setNotice(message);
  }

  function claimReward(reward: ClaimableReward) {
    setClaimedRewards((current) => current.includes(reward.id) ? current : [...current, reward.id]);
    announce(`Visual preview: ${reward.amount.toFixed(4)} ETH from round #${reward.round} marked as claimed.`);
  }

  return (
    <div className={`phone-shell is-${screen}`}>
      <AppHeader announce={announce} />
      {screen === "grab" && <GrabScreen announce={announce} />}
      {screen === "burn" && <BurnScreen announce={announce} />}
      {screen === "rewards" && (
        <RewardsScreen claimedRewards={claimedRewards} onClaim={claimReward} />
      )}
      <BottomNavigation screen={screen} select={setScreen} announce={announce} />
      <div className={notice ? "demo-notice is-visible" : "demo-notice"} role="status" aria-live="polite">
        <span>{notice}</span>
        {notice && <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">×</button>}
      </div>
    </div>
  );
}
