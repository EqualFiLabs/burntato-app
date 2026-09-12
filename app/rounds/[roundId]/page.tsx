import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BurntatoApp } from "@/components/BurntatoApp";
import { formatEth } from "@/lib/burntato/model";
import { publicSiteUrl, roundSharePath } from "@/lib/burntato/sponsorship";
import { readUpcomingRoundFunding } from "@/lib/burntato/sponsorship-server";

type RoundPageProps = { params: Promise<{ roundId: string }> };

function validRoundId(value: string): bigint | null {
  return /^[1-9]\d*$/.test(value) ? BigInt(value) : null;
}

export async function generateMetadata({ params }: RoundPageProps): Promise<Metadata> {
  const { roundId: value } = await params;
  const roundId = validRoundId(value);
  if (roundId === null) return { title: "Upcoming round" };
  const funding = await readUpcomingRoundFunding(roundId);
  const title = `Burntato Round #${value} pots`;
  const description = funding
    ? `${formatEth(funding.winnerReserve)} ETH Winner pot and ${formatEth(funding.recoveryReserve)} ETH Recovery pot locked onchain so far. These amounts may increase before Round #${value} begins.`
    : `See the onchain Winner and Recovery pots for Burntato Round #${value}.`;
  const siteUrl = publicSiteUrl(process.env.NEXT_PUBLIC_BURNTATO_SITE_URL);
  const canonical = siteUrl ? new URL(roundSharePath(roundId), siteUrl).toString() : undefined;
  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: { title, description, type: "website", ...(canonical ? { url: canonical } : {}) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RoundPage({ params }: RoundPageProps) {
  const { roundId: value } = await params;
  const roundId = validRoundId(value);
  if (roundId === null) notFound();
  const funding = await readUpcomingRoundFunding(roundId);
  return (
    <BurntatoApp
      initialScreen="upcoming"
      focusRoundId={value}
      initialRoundFunding={funding ? {
        roundId: funding.roundId.toString(),
        winnerReserve: funding.winnerReserve.toString(),
        recoveryReserve: funding.recoveryReserve.toString(),
        winnerSponsored: funding.winnerSponsored.toString(),
        recoverySponsored: funding.recoverySponsored.toString(),
        fundingBreakdownAvailable: funding.fundingBreakdownAvailable,
      } : undefined}
    />
  );
}
