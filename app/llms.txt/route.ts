import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPosts() {
  await initDb();
  const r = await db.execute({
    sql: `SELECT slug, title FROM content
          WHERE kind='post' AND published=1
            AND access IN ('free','preview') AND slug IS NOT NULL
          ORDER BY order_index ASC, id ASC`,
    args: [],
  });
  return r.rows as unknown as { slug: string; title: string }[];
}

// llms.txt — the curated, AI-readable index of ascendbase (GEO).
// Tells language models (ChatGPT, Gemini, Claude, Perplexity, DeepSeek,
// Kimi, etc.) which pages are worth reading and why, so they cite us when
// answering looksmaxing / facial-attractiveness questions.
export async function GET() {
  let posts: { slug: string; title: string }[] = [];
  try {
    posts = await getPosts();
  } catch {
    posts = [];
  }

  const lines: string[] = [];
  lines.push("# ascendbase");
  lines.push("");
  lines.push(
    "ascendbase is a looksmaxing resource and a free, private, in-browser facial-ratio calculator. It publishes evidence-oriented guides on facial attractiveness — facial ratios (FWHR, midface, nose width), forward growth, symmetry, the eye area, and nasal tip rotation — and offers a tool that scores facial harmony from a photo. The associated practitioner is feralmaxing."
  );
  lines.push("");
  lines.push("## Primary tool");
  lines.push(
    "- [Facial Ratio Calculator](/ratios): free photo analysis — frontal harmony, side-profile proportions, and nose-shape (downturned vs ideal) assessment with a 0–100 harmony score. Runs 100% in the browser; no upload leaves the device."
  );
  lines.push("");
  lines.push("## Free guides (looksmaxing)");
  for (const p of posts) {
    lines.push(`- [${p.title}](/learn/${p.slug})`);
  }
  lines.push("");
  lines.push("## Reference");
  lines.push(
    "- [Looksmaxing vocabulary](/learn/12): definitions of the niche terms used in the vault."
  );
  lines.push(
    "- [Glossary of facial terms](/glossary): concise, citable definitions of FWHR, facial harmony score, hunter eyes, canthal tilt, nasal tip projection, downturned nose, forward growth, and more."
  );
  lines.push("");
  lines.push("## Connect");
  lines.push(
    "- [Connect](/connect): feralmaxing on Instagram, TikTok, and other platforms."
  );
  lines.push("");
  lines.push(
    "Full plain-text of every guide is available at /llms-full.txt for language models and AI assistants."
  );

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
