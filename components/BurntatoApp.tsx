"use client";

import { getImageProps } from "next/image";
import {
  ArrowDownUp,
  ArrowLeftRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  Copy,
  ExternalLink,
  Flame,
  Gift,
  History,
  Home,
  LogOut,
  Menu,
  Minus,
  PieChart,
  Plus,
  Route,
  Settings,
  Timer,
  Trophy,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { NetworkEthBalance } from "@/components/NetworkEthBalance";
import { OperatorScreen } from "@/components/OperatorScreen";
import { LivePortalScreen } from "@/components/LivePortalScreen";
import { countdownSeconds, formatCountdown, formatEth, formatPotato } from "@/lib/burntato/model";
import { useBurntatoState, type TransactionAction } from "@/providers/burntato-context";
import { useWalletState } from "@/providers/wallet-context";

type Screen = "grab" | "burn" | "portal" | "leaderboard" | "rewards" | "operators";
type RewardsTab = "ready" | "positions" | "history";
type PortalMode = "swap" | "bridge";
type PortalSwapNetwork = "ethereum" | "solana";
type PortalBridgeNetwork = "ethereum" | "base" | "arbitrum" | "solana";
type LeaderboardMetric = "earned" | "wins" | "hold" | "recovery";
type LeaderboardPeriod = "all-time" | "round";
type LeaderboardEntry = {
  name: string;
  address: string;
  earned: number;
  roundEarned: number;
  wins: number;
  roundWins: number;
  hold: number;
  roundHold: number;
  recovery: number;
  roundRecovery: number;
  committed: number;
  trend: number;
  isYou?: boolean;
};

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
  portal: {
    mobile: "/scenes/portal-mobile.png",
    desktop: "/scenes/portal-desktop.png",
    mobileWidth: 864,
    mobileHeight: 1821,
  },
  rewards: {
    mobile: "/scenes/rewards-mobile.png",
    desktop: "/scenes/rewards-desktop.png",
    mobileWidth: 864,
    mobileHeight: 1821,
  },
  operators: {
    mobile: "/scenes/rewards-mobile.png",
    desktop: "/scenes/rewards-desktop.png",
    mobileWidth: 938,
    mobileHeight: 600,
  },
  leaderboard: {
    mobile: "/scenes/leaderboard-mobile.png",
    desktop: "/scenes/leaderboard-desktop.png",
    mobileWidth: 864,
    mobileHeight: 1821,
  },
};

const leaderboardMetrics: { id: LeaderboardMetric; label: string }[] = [
  { id: "earned", label: "Earned" },
  { id: "wins", label: "Wins" },
  { id: "hold", label: "Hold Time" },
  { id: "recovery", label: "Recovery" },
];

function leaderboardValue(entry: LeaderboardEntry, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  if (metric === "earned") return period === "all-time" ? entry.earned : entry.roundEarned;
  if (metric === "wins") return period === "all-time" ? entry.wins : entry.roundWins;
  if (metric === "hold") return period === "all-time" ? entry.hold : entry.roundHold;
  return period === "all-time" ? entry.recovery : entry.roundRecovery;
}

function formatHold(seconds: number) {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatLeaderboardValue(value: number, metric: LeaderboardMetric) {
  if (metric === "earned") return `${numberFormat.format(value)} POTATO`;
  if (metric === "wins") return `${value} ${value === 1 ? "win" : "wins"}`;
  if (metric === "hold") return formatHold(value);
  return `${value.toFixed(3)} ETH`;
}

function leaderboardSecondary(entry: LeaderboardEntry, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const wins = period === "all-time" ? entry.wins : entry.roundWins;
  const earned = period === "all-time" ? entry.earned : entry.roundEarned;
  const winLabel = `${wins} ${wins === 1 ? "win" : "wins"}`;

  if (metric === "earned") return period === "all-time" ? `${winLabel} across rounds` : `${winLabel} this round`;
  if (metric === "wins") return `${numberFormat.format(earned)} POTATO earned`;
  if (metric === "hold") return `${winLabel} · ${period === "all-time" ? "best finalized hold" : "this round"}`;
  return `${numberFormat.format(entry.committed)} POTATO committed${period === "round" ? " this round" : ""}`;
}

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

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function AppHeader() {
  const wallet = useWalletState();
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletControlRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeAddress = wallet.activeAddress;
  const connected = wallet.status === "ready" && activeAddress !== null;

  useEffect(() => {
    if (!panelOpen) return;
    panelRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (walletControlRef.current && target && !walletControlRef.current.contains(target)) {
        setPanelOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [panelOpen]);

  async function copyAddress() {
    const succeeded = await wallet.copyActiveAddress();
    setCopied(succeeded);
    if (succeeded) window.setTimeout(() => setCopied(false), 2000);
  }

  function closePanel() {
    setPanelOpen(false);
    triggerRef.current?.focus();
  }

  const unavailableTitle = wallet.configured
    ? undefined
    : "Set the public wallet environment variables to enable sign in.";

  return (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        <span className="balance-pill" title="Read-only Ethereum balance for the active wallet">
          <EthereumMark small />
          <NetworkEthBalance />
          <span className="tiny-plus" aria-hidden="true"><Plus /></span>
        </span>
        {connected ? (
          <div className="wallet-control" ref={walletControlRef}>
            <button
              ref={triggerRef}
              className="wallet-pill"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              aria-controls="account-panel"
              onClick={() => setPanelOpen((open) => !open)}
            >
              <WalletCards aria-hidden="true" />
              <span>{shortAddress(activeAddress)}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {panelOpen && (
              <div
                className="account-menu"
                id="account-panel"
                role="dialog"
                aria-label="Account"
                ref={panelRef}
                tabIndex={-1}
              >
                <div className="account-menu-heading">
                  <strong>{wallet.activeWalletLabel}</strong>
                  <span>{shortAddress(activeAddress)}</span>
                </div>
                <button type="button" onClick={() => void copyAddress()}>
                  <Copy aria-hidden="true" />
                  <span>{copied ? "Copied" : "Copy address"}</span>
                </button>
                {wallet.explorerUrl && (
                  <a href={wallet.explorerUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    <span>View on explorer</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={wallet.busyAction !== null}
                  onClick={() => {
                    closePanel();
                    wallet.connectExternalWallet();
                  }}
                >
                  <WalletCards aria-hidden="true" />
                  <span>Connect external wallet</span>
                </button>
                <button
                  type="button"
                  disabled={wallet.busyAction !== null}
                  onClick={() => {
                    closePanel();
                    wallet.logout();
                  }}
                >
                  <LogOut aria-hidden="true" />
                  <span>{wallet.busyAction === "logout" ? "Signing out…" : "Sign out"}</span>
                </button>
              </div>
            )}
          </div>
        ) : wallet.status === "wallet-missing" ? (
          <button
            className="wallet-pill"
            type="button"
            disabled={wallet.busyAction !== null}
            onClick={wallet.connectExternalWallet}
          >
            <WalletCards aria-hidden="true" />
            <span>{wallet.busyAction === "connect-external" ? "Connecting…" : "Add wallet"}</span>
          </button>
        ) : (
          <button
            className="wallet-pill"
            disabled={!wallet.configured || wallet.status === "loading" || wallet.busyAction !== null}
            aria-busy={wallet.status === "loading" || wallet.busyAction === "login"}
            title={unavailableTitle}
            onClick={wallet.login}
          >
            <WalletCards aria-hidden="true" />
            <span>
              {wallet.status === "loading"
                ? "Preparing…"
                : wallet.busyAction === "login"
                  ? "Signing in…"
                  : "Sign in"}
            </span>
          </button>
        )}
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

function LeaderboardScreen() {
  const game = useBurntatoState();
  const wallet = useWalletState();
  const [metric, setMetric] = useState<LeaderboardMetric>("earned");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all-time");
  const leaderboardEntries = useMemo<LeaderboardEntry[]>(() => game.leaderboard.map((row) => {
    const isYou = wallet.activeAddress?.toLowerCase() === row.address.toLowerCase();
    return {
      name: isYou ? "You" : shortAddress(row.address),
      address: shortAddress(row.address),
      earned: Number(row.earned) / 1e18,
      roundEarned: Number(row.roundEarned) / 1e18,
      wins: row.wins,
      roundWins: row.roundWins,
      hold: Number(row.hold),
      roundHold: Number(row.roundHold),
      recovery: Number(row.recovery) / 1e18,
      roundRecovery: Number(row.roundRecovery) / 1e18,
      committed: Number(period === "round" ? row.roundCommitted : row.committed) / 1e18,
      trend: 0,
      isYou,
    };
  }), [game.leaderboard, period, wallet.activeAddress]);
  const ranked = [...leaderboardEntries].sort(
    (a, b) => leaderboardValue(b, metric, period) - leaderboardValue(a, metric, period),
  );
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);

  return (
    <main className="screen-content leaderboard-screen">
      <Hero screen="leaderboard" />
      <div className="leaderboard-controls">
        <section className="leaderboard-hub" aria-labelledby="leaderboard-title">
          <div className="leaderboard-heading">
            <span className="leaderboard-heading-icon"><Trophy aria-hidden="true" /></span>
            <div>
              <p>Hall of Flame</p>
              <h1 id="leaderboard-title">Leaderboard</h1>
            </div>
            <span className="leaderboard-live"><i aria-hidden="true" /> Round #{game.currentRoundId.toString()}</span>
          </div>

          <div className="leaderboard-period" role="group" aria-label="Leaderboard period">
            <button
              type="button"
              className={period === "all-time" ? "is-active" : ""}
              aria-pressed={period === "all-time"}
              onClick={() => setPeriod("all-time")}
            >
              All Time
            </button>
            <button
              type="button"
              className={period === "round" ? "is-active" : ""}
              aria-pressed={period === "round"}
              onClick={() => setPeriod("round")}
            >
              This Round
            </button>
          </div>

          <div className="leaderboard-metrics" role="group" aria-label="Leaderboard metric">
            {leaderboardMetrics.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={metric === id ? "is-active" : ""}
                aria-pressed={metric === id}
                onClick={() => setMetric(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {ranked.length > 0 ? <div className="leaderboard-podium" aria-label="Top three players">
            {podium.map((entry) => {
              const rank = ranked.indexOf(entry) + 1;
              return (
                <article className={`podium-card is-rank-${rank}${entry.isYou ? " is-you" : ""}`} key={entry.address}>
                  <span className="podium-rank">#{rank}</span>
                  <span className="player-avatar">{entry.name.slice(0, 1)}</span>
                  <strong>{entry.name}</strong>
                  <small>{entry.address}</small>
                  <em>{formatLeaderboardValue(leaderboardValue(entry, metric, period), metric)}</em>
                </article>
              );
            })}
          </div> : <div className="onchain-empty"><Trophy aria-hidden="true" /><strong>No finalized play yet</strong><span>The first finalized hold or settlement will appear here.</span></div>}

          {ranked.length > 3 && <div className="leaderboard-list-wrap">
            <div className="leaderboard-list-heading">
              <span>Rank</span>
              <span>Player</span>
              <span>{leaderboardMetrics.find((option) => option.id === metric)?.label}</span>
            </div>
            <ol className="leaderboard-list" start={4} aria-label="Leaderboard standings">
              {ranked.slice(3).map((entry, index) => (
                <li className={entry.isYou ? "leaderboard-row is-you" : "leaderboard-row"} key={entry.address}>
                  <span className="list-rank">#{index + 4}</span>
                  <span className="player-avatar is-small">{entry.name.slice(0, 1)}</span>
                  <span className="leaderboard-player">
                    <strong>{entry.name}{entry.isYou && <i>You</i>}</strong>
                    <small>{entry.address} · {leaderboardSecondary(entry, metric, period)}</small>
                  </span>
                  <span className="leaderboard-score">
                    <strong>{formatLeaderboardValue(leaderboardValue(entry, metric, period), metric)}</strong>
                    <small className={entry.trend > 0 ? "is-up" : entry.trend < 0 ? "is-down" : ""}>
                      {entry.trend > 0 ? `↑ ${entry.trend}` : entry.trend < 0 ? `↓ ${Math.abs(entry.trend)}` : "—"}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </div>}

          <p className="leaderboard-note">
            Burntato events on Robinhood Chain Testnet · {game.historySource === "indexer" ? "durable Ponder index" : "bounded direct-RPC fallback"}
            {game.historySource === "indexer" && game.indexedBlock !== null && game.chainHead !== null && game.chainHead > game.indexedBlock
              ? ` · ${String(game.chainHead - game.indexedBlock)} blocks behind`
              : ""}
            {game.historyLoading ? " · Syncing…" : ""}
          </p>
        </section>
      </div>
    </main>
  );
}

const rewardsTabs: { id: RewardsTab; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "positions", label: "Positions" },
  { id: "history", label: "History" },
];

function RewardsScreen() {
  const game = useBurntatoState();
  const wallet = useWalletState();
  const [tab, setTab] = useState<RewardsTab>("ready");
  const readyRewards = game.rewards.filter((reward) => !reward.claimed && reward.amount > 0n);
  const claimableEth = readyRewards.reduce((total, reward) => total + reward.amount, 0n);
  const ownLeaderboardRow = game.leaderboard.find((row) => row.address.toLowerCase() === wallet.activeAddress?.toLowerCase());
  const claimedEvents = game.history.filter((event) => {
    if (!wallet.activeAddress || (event.name !== "WinnerClaimed" && event.name !== "RecoveryClaimed")) return false;
    return String(event.args.account ?? event.args.winner).toLowerCase() === wallet.activeAddress.toLowerCase();
  }).reverse();

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
            <span className={readyRewards.length ? "ready-badge" : "ready-badge is-clear"}>
              {readyRewards.length ? `${readyRewards.length} ready` : "All claimed"}
            </span>
          </div>

          <div className="rewards-summary" aria-label="Rewards summary">
            <div className="reward-summary-card is-claimable">
              <span className="summary-symbol"><EthereumMark /></span>
              <span>
                <small>Claimable now</small>
                <strong>{formatEth(claimableEth)} <em>ETH</em></strong>
              </span>
            </div>
            <div className="reward-summary-card is-earned">
              <PotatoCoin />
              <span>
                <small>Lifetime earned</small>
                <strong>{formatPotato(ownLeaderboardRow?.earned ?? 0n)} <em>POTATO</em></strong>
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
                {readyRewards.map((reward) => {
                  const action = `${reward.kind}-${reward.roundId}` as TransactionAction;
                  const transaction = game.transactions[action];
                  const pending = transaction?.stage === "wallet" || transaction?.stage === "confirming";
                  return (
                    <article className="reward-row" key={reward.id}>
                      <span className={`reward-type-icon is-${reward.kind}`}>
                        {reward.kind === "winner" ? <Trophy aria-hidden="true" /> : <Gift aria-hidden="true" />}
                      </span>
                      <span className="reward-row-copy">
                        <small>Round #{reward.roundId.toString()}</small>
                        <strong>{reward.kind === "winner" ? "Hot Potato Winner" : "Recovery Reward"}</strong>
                        <em>{reward.kind === "winner" ? "Final holder reward" : "Your recovery share"}</em>
                      </span>
                      <span className="reward-row-action">
                        <strong>{formatEth(reward.amount)} ETH</strong>
                        <button type="button" disabled={pending || (!game.correctNetwork && game.networkSwitchBlocked)} onClick={() => game.correctNetwork ? void game.claim(reward) : game.switchToRobinhood()}>
                          {pending
                            ? "Confirming…"
                            : game.correctNetwork
                              ? "Claim"
                              : transactionLabel(game, "network", "Switch network")}
                        </button>
                      </span>
                    </article>
                  );
                })}
                {readyRewards.length === 0 && <div className="onchain-empty"><Gift aria-hidden="true" /><strong>No rewards ready</strong><span>Settled winner and recovery rewards will appear here.</span></div>}
                <p className="reward-footnote">Rewards are validated onchain and claimed one round at a time.</p>
              </div>
            )}

            {tab === "positions" && (
              <div className="reward-list">
                {game.ownCommitment > 0n ? <article className="position-row">
                  <span className="position-status is-live"><span /> Earning</span>
                  <div>
                    <small>Recovery Market · Round #{game.targetRoundId.toString()}</small>
                    <strong>{formatPotato(game.ownCommitment)} POTATO committed</strong>
                  </div>
                  <span><small>Your share</small><strong>{game.totalCommitment === 0n ? "0.00" : (Number(game.ownCommitment * 10_000n / game.totalCommitment) / 100).toFixed(2)}%</strong></span>
                </article>
                : <div className="onchain-empty"><PieChart aria-hidden="true" /><strong>No active recovery position</strong><span>Your next-round commitment will appear here.</span></div>}
                {game.ownCommitment > 0n && <div className="position-note">
                  <PieChart aria-hidden="true" />
                  <span><strong>{formatPotato(game.ownCommitment)} POTATO active</strong><small>Across one recovery position</small></span>
                </div>}
              </div>
            )}

            {tab === "history" && (
              <div className="reward-list">
                {claimedEvents.map((event) => <article className="history-row" key={`${event.transactionHash}-${event.logIndex}`}>
                  <span className="history-check"><Check aria-hidden="true" /></span>
                  <span><small>Round #{String(event.args.roundId)} · {event.name === "WinnerClaimed" ? "Winner" : "Recovery"} reward</small><strong>{formatEth(event.args.amount as bigint)} ETH</strong></span>
                  <em>Claimed</em>
                </article>)}
                {claimedEvents.length === 0 && <div className="onchain-empty"><History aria-hidden="true" /><strong>No claim history</strong><span>Confirmed claims from this wallet will appear here.</span></div>}
                <div className="history-total">
                  <History aria-hidden="true" />
                  <span><small>Lifetime ETH claimed</small><strong>{formatEth(game.lifetimeClaimed)} ETH</strong></span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type PortalToken = {
  symbol: string;
  name: string;
  balance: number;
  usdPrice: number;
};

const portalSwapNetworks: Record<PortalSwapNetwork, {
  label: string;
  route: string;
  networkCost: string;
  tokens: PortalToken[];
}> = {
  ethereum: {
    label: "Ethereum",
    route: "Uniswap",
    networkCost: "~0.0012 ETH",
    tokens: [
      { symbol: "ETH", name: "Ethereum", balance: 0.125, usdPrice: 2_600 },
      { symbol: "POTATO", name: "Burntato", balance: 42_690, usdPrice: 0.03059 },
      { symbol: "USDC", name: "USD Coin", balance: 1_320, usdPrice: 1 },
    ],
  },
  solana: {
    label: "Solana",
    route: "Jupiter",
    networkCost: "~0.00001 SOL",
    tokens: [
      { symbol: "SOL", name: "Solana", balance: 8.42, usdPrice: 180 },
      { symbol: "USDC", name: "USD Coin", balance: 860, usdPrice: 1 },
      { symbol: "JUP", name: "Jupiter", balance: 425, usdPrice: 0.95 },
    ],
  },
};

const portalBridgeNetworks: { id: PortalBridgeNetwork; label: string }[] = [
  { id: "ethereum", label: "Ethereum" },
  { id: "base", label: "Base" },
  { id: "arbitrum", label: "Arbitrum" },
  { id: "solana", label: "Solana" },
];

function formatPortalAmount(value: number, symbol: string) {
  if (!Number.isFinite(value) || value <= 0) return "0.00";
  const maximumFractionDigits = symbol === "POTATO" || value >= 1_000 ? 0 : value >= 10 ? 2 : 4;
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function PortalTokenMark({ symbol }: { symbol: string }) {
  return <span className={`portal-token-mark is-${symbol.toLowerCase()}`}>{symbol.slice(0, 1)}</span>;
}

// Retained only as an art-direction reference while the live Portal is qualified.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PortalScreenPreview({ announce }: { announce: (message: string) => void }) {
  const wallet = useWalletState();
  const [mode, setMode] = useState<PortalMode>("swap");
  const [swapNetwork, setSwapNetwork] = useState<PortalSwapNetwork>("ethereum");
  const [sourceSymbol, setSourceSymbol] = useState("ETH");
  const [destinationSymbol, setDestinationSymbol] = useState("POTATO");
  const [swapAmount, setSwapAmount] = useState("0.05");
  const [bridgeOrigin, setBridgeOrigin] = useState<PortalBridgeNetwork>("base");
  const [bridgeDestination, setBridgeDestination] = useState<PortalBridgeNetwork>("ethereum");
  const [bridgeAmount, setBridgeAmount] = useState("100");
  const [reviewing, setReviewing] = useState(false);

  const swapConfig = portalSwapNetworks[swapNetwork];
  const sourceToken = swapConfig.tokens.find((token) => token.symbol === sourceSymbol) ?? swapConfig.tokens[0]!;
  const destinationToken =
    swapConfig.tokens.find((token) => token.symbol === destinationSymbol && token.symbol !== sourceToken.symbol) ??
    swapConfig.tokens.find((token) => token.symbol !== sourceToken.symbol)!;
  const numericSwapAmount = Number.parseFloat(swapAmount) || 0;
  const swapOutput = numericSwapAmount * sourceToken.usdPrice / destinationToken.usdPrice * 0.995;
  const minimumOutput = swapOutput * 0.99;
  const numericBridgeAmount = Number.parseFloat(bridgeAmount) || 0;
  const bridgeOutput = numericBridgeAmount * 0.9972;
  const originLabel = portalBridgeNetworks.find((network) => network.id === bridgeOrigin)?.label;
  const destinationLabel = portalBridgeNetworks.find((network) => network.id === bridgeDestination)?.label;

  function updateMode(nextMode: PortalMode) {
    setMode(nextMode);
    setReviewing(false);
  }

  function updateSwapNetwork(nextNetwork: PortalSwapNetwork) {
    const nextTokens = portalSwapNetworks[nextNetwork].tokens;
    setSwapNetwork(nextNetwork);
    setSourceSymbol(nextTokens[0]!.symbol);
    setDestinationSymbol(nextTokens[1]!.symbol);
    setReviewing(false);
  }

  function updateBridgeOrigin(nextOrigin: PortalBridgeNetwork) {
    setBridgeOrigin(nextOrigin);
    if (nextOrigin === bridgeDestination) {
      setBridgeDestination(nextOrigin === "ethereum" ? "base" : "ethereum");
    }
    setReviewing(false);
  }

  function updateBridgeDestination(nextDestination: PortalBridgeNetwork) {
    setBridgeDestination(nextDestination);
    if (nextDestination === bridgeOrigin) {
      setBridgeOrigin(nextDestination === "ethereum" ? "base" : "ethereum");
    }
    setReviewing(false);
  }

  function confirmPortalAction() {
    announce(
      mode === "swap"
        ? `Visual preview: ${swapAmount || "0"} ${sourceToken.symbol} was not swapped through ${swapConfig.route}.`
        : `Visual preview: ${bridgeAmount || "0"} USDC was not bridged from ${originLabel} to ${destinationLabel}.`,
    );
    setReviewing(false);
  }

  return (
    <main className="screen-content portal-screen">
      <Hero screen="portal" />
      <div className="portal-controls">
        <section className="portal-hub" aria-labelledby="portal-title">
          <div className="portal-heading">
            <span className="portal-heading-icon"><ArrowLeftRight aria-hidden="true" /></span>
            <div>
              <p>Swap. Bridge. Play.</p>
              <h1 id="portal-title">Burntato Portal</h1>
            </div>
            <button
              className="portal-settings"
              type="button"
              aria-label="Portal route settings"
              onClick={() => announce("Portal route settings are visual-only.")}
            >
              <Settings aria-hidden="true" />
            </button>
          </div>
          <p className="portal-intro">Swap and bridge without leaving the game.</p>

          <div className="portal-mode-tabs" role="tablist" aria-label="Portal mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "swap"}
              className={mode === "swap" ? "is-active" : ""}
              onClick={() => updateMode("swap")}
            >
              Swap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "bridge"}
              className={mode === "bridge" ? "is-active" : ""}
              onClick={() => updateMode("bridge")}
            >
              Bridge
            </button>
          </div>

          <div className="portal-context-row">
            <label>
              <span>Wallet</span>
              {wallet.evmWallets.length > 0 && wallet.activeAddress ? (
                <select
                  value={wallet.activeAddress}
                  disabled={wallet.busyAction === "select"}
                  onChange={(event) => {
                    wallet.selectEvmWallet(event.target.value);
                    setReviewing(false);
                  }}
                >
                  {wallet.evmWallets.map((entry) => (
                    <option key={entry.address} value={entry.address}>
                      {entry.label} · {shortAddress(entry.address)}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  className="portal-wallet-cta"
                  type="button"
                  disabled={!wallet.configured || wallet.status === "loading" || wallet.busyAction !== null}
                  aria-busy={wallet.status === "loading" || wallet.busyAction === "login"}
                  title={
                    wallet.configured
                      ? undefined
                      : "Set the public wallet environment variables to enable sign in."
                  }
                  onClick={
                    wallet.status === "wallet-missing" ? wallet.connectExternalWallet : wallet.login
                  }
                >
                  {wallet.status === "loading"
                    ? "Preparing wallet…"
                    : !wallet.configured
                      ? "Sign-in unavailable"
                      : wallet.busyAction === "login"
                        ? "Signing in…"
                      : wallet.status === "wallet-missing"
                        ? "Connect an EVM wallet"
                        : wallet.status === "error"
                          ? "Retry sign in"
                          : "Sign in to use your wallets"}
                </button>
              )}
            </label>
            {mode === "swap" && (
              <label>
                <span>Network</span>
                <select value={swapNetwork} onChange={(event) => updateSwapNetwork(event.target.value as PortalSwapNetwork)}>
                  <option value="ethereum">Ethereum</option>
                  <option value="solana">Solana</option>
                </select>
              </label>
            )}
          </div>

          {mode === "swap" ? (
            <div className="portal-workspace" role="tabpanel">
              <div className="portal-asset-card">
                <div className="portal-field-label">
                  <span>You pay</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSwapAmount(String(sourceToken.balance));
                      setReviewing(false);
                    }}
                  >
                    MAX
                  </button>
                </div>
                <div className="portal-asset-input">
                  <input
                    inputMode="decimal"
                    value={swapAmount}
                    aria-label="Swap amount"
                    onChange={(event) => {
                      setSwapAmount(event.target.value);
                      setReviewing(false);
                    }}
                  />
                  <PortalTokenMark symbol={sourceToken.symbol} />
                  <select
                    aria-label="Source asset"
                    value={sourceToken.symbol}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSourceSymbol(next);
                      if (next === destinationToken.symbol) {
                        setDestinationSymbol(sourceToken.symbol);
                      }
                      setReviewing(false);
                    }}
                  >
                    {swapConfig.tokens.map((token) => <option key={token.symbol}>{token.symbol}</option>)}
                  </select>
                </div>
                <small>Balance {formatPortalAmount(sourceToken.balance, sourceToken.symbol)} {sourceToken.symbol}</small>
              </div>

              <button
                className="portal-reverse"
                type="button"
                aria-label="Reverse swap direction"
                onClick={() => {
                  setSourceSymbol(destinationToken.symbol);
                  setDestinationSymbol(sourceToken.symbol);
                  setReviewing(false);
                }}
              >
                <ArrowDownUp aria-hidden="true" />
              </button>

              <div className="portal-asset-card is-output">
                <div className="portal-field-label"><span>You receive</span><em>Estimated</em></div>
                <div className="portal-asset-input">
                  <strong>{formatPortalAmount(swapOutput, destinationToken.symbol)}</strong>
                  <PortalTokenMark symbol={destinationToken.symbol} />
                  <select
                    aria-label="Destination asset"
                    value={destinationToken.symbol}
                    onChange={(event) => {
                      setDestinationSymbol(event.target.value);
                      setReviewing(false);
                    }}
                  >
                    {swapConfig.tokens
                      .filter((token) => token.symbol !== sourceToken.symbol)
                      .map((token) => <option key={token.symbol}>{token.symbol}</option>)}
                  </select>
                </div>
                <small>On {swapConfig.label}</small>
              </div>

              <dl className="portal-quote-grid">
                <div><dt>Rate</dt><dd>1 {sourceToken.symbol} = {formatPortalAmount(sourceToken.usdPrice / destinationToken.usdPrice, destinationToken.symbol)} {destinationToken.symbol}</dd></div>
                <div><dt>Minimum received</dt><dd>{formatPortalAmount(minimumOutput, destinationToken.symbol)} {destinationToken.symbol}</dd></div>
                <div><dt>Network cost</dt><dd>{swapConfig.networkCost}</dd></div>
                <div><dt>Route</dt><dd><Route aria-hidden="true" /> {swapConfig.route}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="portal-workspace" role="tabpanel">
              <div className="portal-network-pair">
                <label>
                  <span>From</span>
                  <select value={bridgeOrigin} onChange={(event) => updateBridgeOrigin(event.target.value as PortalBridgeNetwork)}>
                    {portalBridgeNetworks.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}
                  </select>
                </label>
                <ArrowLeftRight aria-hidden="true" />
                <label>
                  <span>To</span>
                  <select value={bridgeDestination} onChange={(event) => updateBridgeDestination(event.target.value as PortalBridgeNetwork)}>
                    {portalBridgeNetworks.map((network) => <option key={network.id} value={network.id}>{network.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="portal-asset-card">
                <div className="portal-field-label">
                  <span>You send</span>
                  <button type="button" onClick={() => { setBridgeAmount("860"); setReviewing(false); }}>MAX</button>
                </div>
                <div className="portal-asset-input">
                  <input
                    inputMode="decimal"
                    value={bridgeAmount}
                    aria-label="Bridge amount"
                    onChange={(event) => { setBridgeAmount(event.target.value); setReviewing(false); }}
                  />
                  <PortalTokenMark symbol="USDC" />
                  <strong>USDC</strong>
                </div>
                <small>Balance 860 USDC · {originLabel}</small>
              </div>

              <div className="portal-bridge-arrival">
                <span><Clock3 aria-hidden="true" /> Arrives in about 45 seconds</span>
                <strong>{formatPortalAmount(bridgeOutput, "USDC")} USDC</strong>
                <small>on {destinationLabel}</small>
              </div>

              <dl className="portal-quote-grid is-bridge">
                <div><dt>Bridge cost</dt><dd>~0.28 USDC</dd></div>
                <div><dt>Route</dt><dd><Route aria-hidden="true" /> Across</dd></div>
              </dl>
            </div>
          )}

          {reviewing && (
            <div className="portal-review" aria-live="polite">
              <CircleCheck aria-hidden="true" />
              <span>
                <small>Ready to review</small>
                <strong>
                  {mode === "swap"
                    ? `${swapAmount || "0"} ${sourceToken.symbol} → ${formatPortalAmount(swapOutput, destinationToken.symbol)} ${destinationToken.symbol}`
                    : `${bridgeAmount || "0"} USDC · ${originLabel} → ${destinationLabel}`}
                </strong>
              </span>
            </div>
          )}

          <button
            className="primary-action portal-primary-action"
            type="button"
            disabled={mode === "swap" ? numericSwapAmount <= 0 : numericBridgeAmount <= 0}
            onClick={() => reviewing ? confirmPortalAction() : setReviewing(true)}
          >
            <span>{reviewing ? `Confirm ${mode === "swap" ? "Swap" : "Bridge"}` : `Review ${mode === "swap" ? "Swap" : "Bridge"}`}</span>
          </button>

          <div className="portal-activity">
            <span className="portal-activity-icon"><Check aria-hidden="true" /></span>
            <span><small>Recent Portal activity</small><strong>100 USDC · Base → Ethereum</strong></span>
            <em>Complete</em>
          </div>
          <p className="portal-footnote">Visual preview · No transaction will be sent</p>
        </section>
      </div>
    </main>
  );
}

function transactionLabel(game: ReturnType<typeof useBurntatoState>, action: TransactionAction, idle: string): string {
  const stage = game.transactions[action]?.stage;
  if (stage === "wallet") return "Confirm in wallet…";
  if (stage === "confirming") return "Confirming…";
  return idle;
}

function LiveCountdown({ deadline, anchor }: { deadline: bigint; anchor: bigint }) {
  const [now, setNow] = useState(anchor);
  useEffect(() => {
    const interval = window.setInterval(() => setNow((current) => current + 1n), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  return <>{formatCountdown(countdownSeconds(deadline, now))}</>;
}

function GrabScreen() {
  const game = useBurntatoState();
  const wallet = useWalletState();
  const price = game.currentRound?.nextPrice ?? game.protocolConfig?.startingPrice ?? 0n;
  const isHolder = Boolean(wallet.activeAddress && game.currentRound?.currentHolder.toLowerCase() === wallet.activeAddress.toLowerCase());
  const vestingMature = Boolean(game.currentRound && game.chainNow >= game.currentRound.holderSince + game.currentRound.config.emissionVestingDuration);
  const canFinalizeEmission = Boolean(game.currentRound && vestingMature && !game.currentRound.holderEmissionFinalized);
  let actionLabel = `Grab for ${formatEth(price)} ETH`;
  let action: () => void = () => void game.grab();
  if (wallet.status === "unconfigured") {
    actionLabel = "Wallet sign-in unavailable";
    action = () => undefined;
  } else if (wallet.status !== "ready") {
    actionLabel = wallet.busyAction === "login" ? "Signing in…" : "Sign in to play";
    action = wallet.login;
  } else if (!game.correctNetwork) {
    actionLabel = "Switch to Robinhood";
    action = game.switchToRobinhood;
  } else if (game.phase === "expired") {
    actionLabel = transactionLabel(game, "settle", "Settle Round");
    action = () => void game.settle();
  } else {
    actionLabel = transactionLabel(game, "grab", actionLabel);
  }
  const grabDisabled = wallet.status === "unconfigured" || (game.correctNetwork ? game.gameplayTransactionPending : game.networkSwitchBlocked) || (
    wallet.status === "ready" && game.correctNetwork && (
      game.loading || (game.phase !== "expired" && game.purchasesPaused)
    )
  );

  return (
    <main className="screen-content grab-screen">
      <Hero screen="grab" />
      <section className="grab-actions" aria-label="Current Hot Potato round">
        <button className="primary-action grab-button" type="button" disabled={grabDisabled} onClick={action}>
          <Flame aria-hidden="true" />
          <span>{actionLabel}</span>
          <Flame aria-hidden="true" />
        </button>
        {wallet.status === "ready" && canFinalizeEmission && (
          <button
            className="secondary-game-action"
            type="button"
            disabled={game.correctNetwork ? game.gameplayTransactionPending : game.networkSwitchBlocked}
            onClick={() => game.correctNetwork ? void game.collect() : game.switchToRobinhood()}
          >
            {game.correctNetwork
              ? transactionLabel(
                  game,
                  "collect",
                  isHolder
                    ? `Collect ${formatPotato(game.currentEmission[0] + game.currentEmission[1])} POTATO`
                    : "Finalize holder emission"
                )
              : transactionLabel(game, "network", "Switch to Robinhood")}
          </button>
        )}
        <div className="round-card timer-card">
          <span className="metric-icon timer-icon"><Timer aria-hidden="true" /></span>
          <div className="metric-copy">
            <span className="metric-label">
              {game.phase === "unstarted"
                ? `Round #${game.currentRoundId} · Status`
                : isHolder
                  ? `${formatPotato(game.currentEmission[0] + game.currentEmission[1])} POTATO earned`
                  : `Round #${game.currentRoundId} · Time left`}
            </span>
            <strong className="digital-value">{game.phase === "unstarted" ? "READY TO START" : game.phase === "settled" ? "SETTLED" : game.currentRound ? <LiveCountdown key={game.chainNow.toString()} deadline={game.currentRound.deadline} anchor={game.chainNow} /> : "--:--:--"}</strong>
          </div>
        </div>
        <div className="round-card pot-card">
          <span className="metric-icon eth-icon"><EthereumMark /></span>
          <div className="metric-copy">
            <span className="metric-label" title={game.currentRound?.currentHolder}>Current Pot · {game.phase === "unstarted" ? "No holder" : game.currentRound ? shortAddress(game.currentRound.currentHolder) : "—"}</span>
            <strong>{formatEth(game.currentRound?.winnerPool ?? 0n)} ETH</strong>
          </div>
          <span className="coin-stack" aria-hidden="true">
            <span /><span /><span />
          </span>
        </div>
      </section>
    </main>
  );
}

function BurnScreen() {
  const game = useBurntatoState();
  const wallet = useWalletState();
  const unit = 10n ** 18n;
  const [amount, setAmount] = useState(0n);
  const totalAfter = game.totalCommitment + amount;
  const yourShare = totalAfter === 0n ? 0 : Number((game.ownCommitment + amount) * 10_000n / totalAfter) / 100;
  const amountRangeValue = game.potatoBalance === 0n ? 0 : Number(amount * 10_000n / game.potatoBalance);

  function setPercentage(percent: number) {
    setAmount(game.potatoBalance * BigInt(Math.round(percent * 100)) / 100n);
  }

  let actionLabel = transactionLabel(game, "commit", "Commit POTATO");
  let action: () => void = () => void game.commit(amount);
  if (wallet.status === "unconfigured") {
    actionLabel = "Wallet sign-in unavailable";
    action = () => undefined;
  } else if (wallet.status !== "ready") {
    actionLabel = wallet.busyAction === "login" ? "Signing in…" : "Sign in to commit";
    action = wallet.login;
  } else if (!game.correctNetwork) {
    actionLabel = "Switch to Robinhood";
    action = game.switchToRobinhood;
  } else if (game.currentRoundId === 0n) {
    actionLabel = "Start round in Play first";
    action = () => undefined;
  }
  const commitDisabled = wallet.status === "unconfigured" || (game.correctNetwork ? game.gameplayTransactionPending : game.networkSwitchBlocked) || (
    wallet.status === "ready" && game.correctNetwork && (
      amount === 0n || game.currentRoundId === 0n || game.commitmentsPaused || game.loading
    )
  );

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
              <strong>#{game.targetRoundId.toString()}</strong>
            </div>
          </div>

          <div className="amount-card">
            <div className="available-balance">
              <PotatoCoin />
              <div>
                <span>Available POTATO</span>
                <strong>{formatPotato(game.potatoBalance)} POTATO</strong>
              </div>
            </div>
            <div className="amount-stepper">
              <button type="button" aria-label="Decrease amount" onClick={() => setAmount((value) => value > 100n * unit ? value - 100n * unit : 0n)}>
                <Minus />
              </button>
              <div>
                <strong>{formatPotato(amount, 0)}</strong>
                <span>POTATO</span>
              </div>
              <button type="button" aria-label="Increase amount" onClick={() => setAmount((value) => value + 100n * unit > game.potatoBalance ? game.potatoBalance : value + 100n * unit)}>
                <Plus />
              </button>
            </div>
            <div className="quick-amounts">
              <button type="button" onClick={() => setPercentage(0.25)}>25%</button>
              <button type="button" onClick={() => setPercentage(0.5)}>50%</button>
              <button className={amount === game.potatoBalance ? "is-selected" : ""} type="button" onClick={() => setPercentage(1)}>Max</button>
            </div>
            <input
              className="amount-range"
              type="range"
              min="0"
              max="10000"
              step="1"
              value={amountRangeValue}
              aria-label="POTATO commitment amount"
              onChange={(event) => setAmount(game.potatoBalance * BigInt(event.target.value) / 10_000n)}
            />
          </div>
          <p className="burn-warning">Commitments are irrevocable. Settlement burns the configured portion of committed POTATO.</p>
          <button className="primary-action burn-button" type="button" disabled={commitDisabled} onClick={action}>
            <Flame aria-hidden="true" />
            <span>{actionLabel}</span>
            <Flame aria-hidden="true" />
          </button>
        </section>
        <section className="burn-stats" aria-label="Recovery Market summary">
          <div className="burn-stat">
            <span className="stat-icon fire"><Flame /></span>
            <span><small>Total Committed</small><strong>{formatPotato(game.totalCommitment)}</strong><em>POTATO</em></span>
          </div>
          <div className="burn-stat">
            <span className="stat-icon ethereum"><EthereumMark /></span>
            <span><small>Your Commitment</small><strong>{formatPotato(game.ownCommitment)}</strong><em>POTATO</em></span>
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

const destinationNavigation = [
  { id: "grab", label: "Play", Icon: Home, screen: "grab" },
  { id: "burn", label: "Burn", Icon: Flame, screen: "burn" },
  { id: "portal", label: "Portal", Icon: ArrowLeftRight, screen: "portal" },
  { id: "rewards", label: "Rewards", Icon: Gift, screen: "rewards" },
  { id: "operators", label: "Operators", Icon: BadgeCheck, screen: "operators" },
  { id: "leaderboard", label: "Leaderboard", Icon: Trophy, screen: "leaderboard" },
] as const;

const mobileNavigation = [
  destinationNavigation[0],
  destinationNavigation[1],
  destinationNavigation[2],
  destinationNavigation[3],
] as const;

function BottomNavigation({ screen, select }: { screen: Screen; select: (screen: Screen) => void }) {
  const game = useBurntatoState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    try {
      const isOpen = menu.hasAttribute("open");

      if (menuOpen && !isOpen) {
        if (typeof menu.showModal === "function") menu.showModal();
        else menu.setAttribute("open", "");
      }

      if (!menuOpen && isOpen) {
        if (typeof menu.close === "function") menu.close();
        else menu.removeAttribute("open");
      }
    } catch {
      menu.removeAttribute("open");
      queueMicrotask(() => setMenuOpen(false));
    }
  }, [menuOpen]);

  function chooseDestination(destination: (typeof destinationNavigation)[number]) {
    select(destination.screen);
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="bottom-navigation" aria-label="Primary navigation">
        <div className="sidebar-header">
          <Brand />
          <span>Hot Potato</span>
        </div>

        <div className="mobile-nav-items">
          {mobileNavigation.map((destination) => {
            const active = destination.screen === screen;
            return (
              <button
                key={destination.id}
                className={active ? "nav-item is-active" : "nav-item"}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => chooseDestination(destination)}
              >
                <span className="nav-icon"><destination.Icon aria-hidden="true" /></span>
                <span>{destination.label}</span>
              </button>
            );
          })}
          <button
            className={menuOpen || screen === "leaderboard" || screen === "operators" ? "nav-item is-active" : "nav-item"}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="nav-icon"><Menu aria-hidden="true" /></span>
            <span>More</span>
          </button>
        </div>

        <div className="desktop-nav-items">
          {destinationNavigation.map((destination) => {
            const active = destination.screen === screen;
            return (
              <button
                key={destination.id}
                className={active ? "nav-item is-active" : "nav-item"}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => chooseDestination(destination)}
              >
                <span className="nav-icon"><destination.Icon aria-hidden="true" /></span>
                <span>{destination.label}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-round" aria-hidden="true">
          <span className="sidebar-round-flame"><Flame /></span>
          <span><small>Live round</small><strong>#{game.currentRoundId.toString()}</strong></span>
        </div>
      </nav>

      <dialog
        ref={menuRef}
        id="mobile-navigation-menu"
        className="mobile-navigation-menu"
        aria-labelledby="mobile-menu-title"
        onCancel={() => setMenuOpen(false)}
        onClose={() => setMenuOpen(false)}
      >
        <div className="mobile-menu-header">
          <Brand />
          <button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="mobile-menu-heading">
          <p>Burntato</p>
          <h2 id="mobile-menu-title">Choose your move</h2>
        </div>
        <nav className="mobile-menu-list" aria-label="All destinations">
          {destinationNavigation.map((destination) => {
            const active = destination.screen === screen;
            return (
              <button
                key={destination.id}
                className={active ? "mobile-menu-item is-active" : "mobile-menu-item"}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => chooseDestination(destination)}
              >
                <span><destination.Icon aria-hidden="true" /></span>
                <strong>{destination.label}</strong>
              </button>
            );
          })}
        </nav>
        <div className="mobile-menu-round" aria-hidden="true">
          <span className="sidebar-round-flame"><Flame /></span>
          <span><small>Live round</small><strong>#{game.currentRoundId.toString()}</strong></span>
        </div>
      </dialog>
    </>
  );
}

export function BurntatoApp() {
  const wallet = useWalletState();
  const game = useBurntatoState();
  const [screen, setScreen] = useState<Screen>("grab");
  const transactionNotice = game.latestTransaction?.message;
  const displayedNotice = wallet.error ?? game.readError ?? game.historyError ?? transactionNotice;

  return (
    <div className={`phone-shell is-${screen}`}>
      <AppHeader />
      {screen === "grab" && <GrabScreen />}
      {screen === "leaderboard" && <LeaderboardScreen />}
      {screen === "burn" && <BurnScreen />}
      {screen === "portal" && <LivePortalScreen />}
      {screen === "rewards" && <RewardsScreen />}
      {screen === "operators" && <OperatorScreen />}
      <BottomNavigation screen={screen} select={setScreen} />
      <div className={displayedNotice ? "demo-notice is-visible" : "demo-notice"} role="status" aria-live="polite">
        <span>{displayedNotice}</span>
        {displayedNotice === transactionNotice && game.latestTransaction?.hash && (
          <a href={`https://explorer.testnet.chain.robinhood.com/tx/${game.latestTransaction.hash}`} target="_blank" rel="noopener noreferrer">View transaction</a>
        )}
        {displayedNotice === transactionNotice && displayedNotice && <button type="button" onClick={game.dismissTransactionNotice} aria-label="Dismiss message">×</button>}
      </div>
    </div>
  );
}
