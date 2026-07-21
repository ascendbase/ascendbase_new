import { ImageResponse } from "next/og";

// Dynamic Open Graph image for sharing facial harmony scores.
// Usage: /api/og/result?score=87&tier=Strong&mode=frontal
// Returns a 1200x630 PNG for social cards. No external deps (next/og is bundled).

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = Math.max(0, Math.min(100, Number(searchParams.get("score")) || 0));
  const tier = searchParams.get("tier") || "Balanced";
  const mode = searchParams.get("mode") || "facial";

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
        <div style={{ display: "flex", fontSize: 34, color: "rgba(255,255,255,0.6)", letterSpacing: 2 }}>
          ascendbase · {mode} harmony
        </div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 900, marginTop: 10 }}>
          {score}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#ff3b3b", marginTop: 4 }}>
          {tier}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.5)", marginTop: 24 }}>
          Test your own facial ratios — free, private, in-browser
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
