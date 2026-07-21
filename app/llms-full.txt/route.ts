import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reconstruct plain text from a post's blocks JSON ({ type, text, preview }).
function blocksToText(blocksJson: string | null): string {
  if (!blocksJson) return "";
  try {
    const blocks = JSON.parse(blocksJson);
    if (!Array.isArray(blocks)) return "";
    return blocks
      .map((b: { text?: string }) => (typeof b?.text === "string" ? b.text : ""))
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return "";
  }
}

// llms-full.txt — the complete processed text of every public guide.
// Consumed by LLMs that want the full corpus rather than the curated index.
export async function GET() {
  let posts: Array<{
    slug: string;
    title: string;
    body: string | null;
    blocks: string | null;
  }> = [];
  try {
    await initDb();
    const r = await db.execute({
      sql: `SELECT slug, title, body, blocks FROM content
            WHERE kind='post' AND published=1
              AND access IN ('free','preview') AND slug IS NOT NULL
            ORDER BY order_index ASC, id ASC`,
      args: [],
    });
    posts = r.rows as unknown as typeof posts;
  } catch {
    posts = [];
  }

  const parts: string[] = [];
  parts.push("# ascendbase — full content");
  parts.push("");
  parts.push(`Source: ${SITE_URL}`);
  parts.push(
    "This file contains the full text of all publicly available ascendbase looksmaxing guides, provided for language models and AI assistants."
  );
  parts.push("");
  for (const p of posts) {
    const text = [p.body, blocksToText(p.blocks)].filter(Boolean).join("\n\n").trim();
    if (!text) continue;
    parts.push(`## ${p.title}`);
    parts.push(`URL: ${SITE_URL}/learn/${p.slug}`);
    parts.push("");
    parts.push(text);
    parts.push("");
    parts.push("---");
    parts.push("");
  }

  return new NextResponse(parts.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
