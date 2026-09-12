import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BurntatoApp } from "@/components/BurntatoApp";
import { formatEth } from "@/lib/burntato/model";
import { publicSiteUrl, roundSharePath } from "@/lib/burntato/sponsorship";
import { readSponsoredRound } from "@/lib/burntato/sponsorship-server";

type RoundPageProps = { params: Promise<{ roundId: string }> };

function validRoundId(value: string): bigint | null {
  return /^[1-9]\d*$/.test(value) ? BigInt(value) : null;
}

export async function generateMetadata({ params }: RoundPageProps): Promise<Metadata> {
  const { roundId: value } = await params;
  const roundId = validRoundId(value);
  if (roundId === null) return { title: "Upcoming round" };
  const sponsored = await readSponsoredRound(roundId);
  const title = `Round #${value} sponsorship`;
  const description = sponsored
    ? `${formatEth(sponsored.winnerReserve)} ETH Winner pot and ${formatEth(sponsored.recoveryReserve)} ETH Recovery pot locked onchain so far. These amounts may increase before Round #${value} begins.`
    : `See the onchain Winner and Recovery sponsorship for Burntato Round #${value}.`;
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
  const sponsored = await readSponsoredRound(roundId);
  return (
    <BurntatoApp
      initialScreen="upcoming"
      focusRoundId={value}
      initialSponsoredRound={sponsored ? {
        roundId: sponsored.roundId.toString(),
        winnerReserve: sponsored.winnerReserve.toString(),
        recoveryReserve: sponsored.recoveryReserve.toString(),
      } : undefined}
    />
  );
}
