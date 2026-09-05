import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#f36d22", color: "#1c0d05", fontSize: 24, fontWeight: 900 }}>B</div>,
    size,
  );
}
