import { getImageProps } from "next/image";

export type HeroScreen = "grab" | "burn" | "portal" | "leaderboard" | "rewards";

const heroSources: Record<HeroScreen, {
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
  leaderboard: {
    mobile: "/scenes/leaderboard-mobile.png",
    desktop: "/scenes/leaderboard-desktop.png",
    mobileWidth: 864,
    mobileHeight: 1821,
  },
};

export function ScreenHero({ screen }: { screen: HeroScreen }) {
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
