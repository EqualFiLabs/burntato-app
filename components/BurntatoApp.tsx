"use client";

import Image from "next/image";
import {
  ChevronDown,
  Flame,
  Gift,
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

type Screen = "grab" | "burn";

const potatoBalance = 42_690;
const numberFormat = new Intl.NumberFormat("en-US");

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
  const source = screen === "grab" ? "/reference/grab.png" : "/reference/burn.png";
  return (
    <div className={`hero hero-${screen}`} aria-label={`Static Tato artwork for the ${screen} screen`}>
      <Image src={source} alt="" width={941} height={1672} priority className="hero-source" />
      <div className="hero-vignette" />
    </div>
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
    </main>
  );
}

const navigation = [
  { id: "grab", label: "Home", Icon: Home, notice: false },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy, notice: false },
  { id: "burn", label: "Burn", Icon: Flame, notice: false },
  { id: "rewards", label: "Rewards", Icon: Gift, notice: true },
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
                if (id === "grab" || id === "burn") select(id);
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

  function announce(message: string) {
    setNotice(message);
  }

  return (
    <div className={`phone-shell is-${screen}`}>
      <AppHeader announce={announce} />
      {screen === "grab" ? <GrabScreen announce={announce} /> : <BurnScreen announce={announce} />}
      <BottomNavigation screen={screen} select={setScreen} announce={announce} />
      <div className={notice ? "demo-notice is-visible" : "demo-notice"} role="status" aria-live="polite">
        <span>{notice}</span>
        {notice && <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">×</button>}
      </div>
    </div>
  );
}
