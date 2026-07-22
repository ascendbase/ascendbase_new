import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Flatten a post's blocks (or body) into a single plain-text string. */
function blocksToText(raw: any, body?: string | null): string {
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return (raw || "").toString();
    }
  }
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((b: any) => {
        if (b?.type === "text") return (b.text || "").toString();
        if (b?.type === "image") return `[image: ${b.caption || b.url || ""}]`;
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (body) return body.toString();
  return "";
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Score every vault post against a query and return the most relevant ones.
 * Also force-includes posts the user explicitly references by id / slug / title.
 */
function retrievePosts(
  posts: {
    id: number;
    title: string;
    slug: string | null;
    text: string;
    kind?: string;
    access?: string;
  }[],
  query: string,
  limit = 8
) {
  const q = query.toLowerCase();
  const tokens = tokenize(query);
  const scored = posts.map((p) => {
    let score = 0;
    const title = p.title.toLowerCase();
    const text = p.text.toLowerCase();
    // Explicit reference: "#42", "post 42", "id 42", "/slug", exact title.
    if (new RegExp(`(?:post|id|#)\\s*${p.id}\\b`).test(q)) score += 100;
    if (p.slug && q.includes(p.slug.toLowerCase())) score += 100;
    if (title && q.includes(title)) score += 80;
    for (const t of tokens) {
      if (title.includes(t)) score += 6;
      // count occurrences in body (capped)
      let idx = text.indexOf(t);
      let cnt = 0;
      while (idx !== -1 && cnt < 20) {
        cnt++;
        idx = text.indexOf(t, idx + t.length);
      }
      score += cnt;
    }
    return { p, score };
  });
  const forced = scored.filter((s) => s.score >= 80);
  const matched = scored
    .filter((s) => s.score > 0 && s.score < 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const picked = [...forced, ...matched]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);
  return picked;
}

const BASE_SYSTEM = `You are the "Vault Assistant" for ascendbase — a knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing).

You have access to the ENTIRE vault dataset (Turso). Below is the full table of contents: every post and folder with its numeric id, title, slug, and access tier. When the user references a specific post (by id like "#42", slug, or title) or asks about a topic, the FULL content of the relevant posts is injected into the "RETRIEVED VAULT CONTENT" block for that turn.

How to answer:
- Ground every factual claim in the retrieved vault content. Cite the source post by title and id (e.g. "per 'Bone structure vs soft tissue' (#42)…").
- If the retrieved content does not cover the question, say so plainly — do NOT invent posts, studies, or facts that are not in the data.
- You may cross-reference multiple posts when it helps.
- Be concise and structured; use bullet points where useful.
- Never mention posts that are not listed in the table of contents.`;

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set in env." },
      { status: 500 }
    );

  const { messages, model } = (await req.json().catch(() => ({}))) as {
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
    model?: string;
  };
  if (!Array.isArray(messages) || !messages.length)
    return NextResponse.json(
      { error: "messages are required." },
      { status: 400 }
    );

  const modelName =
    model || process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

  // --- Load the whole vault from Turso ---
  const rows = await db.execute({
    sql: `SELECT id, slug, title, body, blocks, kind, access, parent_id
          FROM content ORDER BY id ASC`,
    args: [],
  });
  const all = (rows.rows as any[]).map((r) => {
    const text = blocksToText(r.blocks, r.body);
    return {
      id: Number(r.id),
      title: String(r.title || ""),
      slug: r.slug ? String(r.slug) : null,
      kind: String(r.kind || "post"),
      access: String(r.access || "free"),
      parent_id: r.parent_id != null ? Number(r.parent_id) : null,
      text,
    };
  });

  // Table of contents for the system prompt.
  const index = all
    .map(
      (p) =>
        `- #${p.id} [${p.kind}${
          p.access !== "free" ? "/" + p.access : ""
        }] ${p.title}${p.slug ? ` (/${p.slug})` : ""}`
    )
    .join("\n");
  const systemWithIndex = `${BASE_SYSTEM}\n\nVAULT TABLE OF CONTENTS (${all.length} items):\n${index}`;

  // Retrieve relevant posts for the latest user message.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  let retrievedBlock = "";
  if (lastUser) {
  const picked = retrievePosts(
      all.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        text: p.text,
        kind: p.kind,
        access: p.access,
      })),
      lastUser.content,
      8
    );
    if (picked.length) {
      const parts = picked.map((p) => {
        const truncated =
          p.text.length > 4000 ? p.text.slice(0, 4000) + "\n…(truncated)" : p.text;
        return `### Post #${p.id}: ${p.title}${
          p.slug ? ` (/${p.slug})` : ""
        } [${p.kind}/${p.access}]\n${truncated}`;
      });
      retrievedBlock = `RETRIEVED VAULT CONTENT (most relevant posts for this query):\n\n${parts.join(
        "\n\n"
      )}`;
    }
  }

  const outMessages: any[] = [{ role: "system", content: systemWithIndex }];
  if (retrievedBlock) {
    outMessages.push({ role: "system", content: retrievedBlock });
  }
  // Pass through the client's running conversation (user/assistant turns).
  outMessages.push(
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  );

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://www.ascendbase.pro",
        "X-Title": "ascendbase",
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.4,
        messages: outMessages,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json(
        { error: `OpenRouter error ${r.status}: ${txt.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "";
    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Vault chat failed: ${e?.message || e}` },
      { status: 502 }
    );
  }
}