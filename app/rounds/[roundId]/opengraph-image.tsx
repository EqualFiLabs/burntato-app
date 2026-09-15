import { ImageResponse } from "next/og";

import { formatEth } from "@/lib/burntato/model";
import { readUpcomingRoundFunding } from "@/lib/burntato/sponsorship-server";

export const alt = "Burntato upcoming round pots";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function RoundOpenGraphImage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId: value } = await params;
  const roundId = /^[1-9]\d*$/.test(value) ? BigInt(value) : 0n;
  const funding = roundId > 0n ? await readUpcomingRoundFunding(roundId) : null;
  const winner = funding ? formatEth(funding.winnerReserve) : "—";
  const recovery = funding ? formatEth(funding.recoveryReserve) : "—";
  const sponsored = funding?.fundingBreakdownAvailable
    ? `${formatEth(funding.winnerSponsored + funding.recoverySponsored)} ETH community sponsored`
    : "Funding sources available in the app";

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 74, background: "radial-gradient(circle at 78% 22%, #692616 0, #190b06 44%, #050403 76%)", color: "#fff5e9" }}>
      <div style={{ display: "flex", color: "#f36d22", fontSize: 56, fontWeight: 900 }}>Burntato · Upcoming Round</div>
      <div style={{ display: "flex", marginTop: 12, fontSize: 88, fontWeight: 950, letterSpacing: -4 }}>Round #{value}</div>
      <div style={{ display: "flex", marginTop: 42, gap: 28 }}>
        <div style={{ width: 490, display: "flex", flexDirection: "column", padding: 26, border: "2px solid #ff9b32", borderRadius: 22, background: "rgba(30,18,10,.78)" }}>
          <span style={{ display: "flex", color: "#ffc887", fontSize: 24 }}>WINNER POT · LOCKED SO FAR</span>
          <strong style={{ display: "flex", marginTop: 10, fontSize: 46 }}>{winner} ETH</strong>
        </div>
        <div style={{ width: 490, display: "flex", flexDirection: "column", padding: 26, border: "2px solid #ff5332", borderRadius: 22, background: "rgba(30,18,10,.78)" }}>
          <span style={{ display: "flex", color: "#ffc887", fontSize: 24 }}>RECOVERY POT · LOCKED SO FAR</span>
          <strong style={{ display: "flex", marginTop: 10, fontSize: 46 }}>{recovery} ETH</strong>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 28, color: "#d7b99d", fontSize: 22 }}>{sponsored} · Pots may increase before the round begins.</div>
    </div>,
    size,
  );
}
