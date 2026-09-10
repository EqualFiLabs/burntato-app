import { ImageResponse } from "next/og";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";

export const alt = `Burntato — fully onchain Hot Potato on ${BURNTATO_DEPLOYMENT.network}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "radial-gradient(circle at 75% 25%, #5f2413 0, #160a06 42%, #050403 75%)", color: "#fff5e9" }}>
      <div style={{ display: "flex", color: "#f36d22", fontSize: 88, fontWeight: 900, letterSpacing: -5 }}>Burntato</div>
      <div style={{ display: "flex", marginTop: 20, maxWidth: 860, fontSize: 42, lineHeight: 1.2 }}>Grab it. Hold it. Don&apos;t get burned.</div>
      <div style={{ display: "flex", marginTop: 48, color: "#ffbd82", fontSize: 25 }}>{BURNTATO_DEPLOYMENT.network}</div>
    </div>,
    size,
  );
}
