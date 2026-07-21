import { ImageResponse } from "next/og";

// Auto-generated default Open Graph image for the site root and any route
// without its own opengraph-image. Served at /opengraph-image.
export const runtime = "edge";
export const alt = "ascendbase — male facial attractiveness, decoded";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 50% 30%, rgba(0,182,3,0.18), transparent 70%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, letterSpacing: -2 }}>
          ascend<span style={{ color: "#ff3b3b" }}>base</span>
        </div>
        <div style={{ display: "flex", fontSize: 38, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>
          Male facial attractiveness, decoded
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.45)", marginTop: 28 }}>
          Free facial ratio calculator · Free looksmaxing vault
        </div>
      </div>
    ),
    { ...size }
  );
}
