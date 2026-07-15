import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * AI-edit an EXISTING post in place.
 * Sends the post's current text blocks + a user instruction to OpenRouter.
 * The model rewrites ONLY the text blocks' content (improves grammar,
 * re-frames, expands, etc.) — it must KEEP the same number/order of
 * blocks, keep all image blocks untouched, and return the full block array.
 * The result is returned to the client for review; nothing is saved until
 * the admin clicks Save in the editor.
 */
const SYSTEM = `You are a senior editor for "ascendbase" — a knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing).

You are given an EXISTING post made of blocks and an INSTRUCTION on how to rewrite it. Rewrite the post per the instruction.

Rules — STRICTLY follow:
- Return ONLY valid JSON (no markdown fences) of this exact shape:
  { "blocks": [ ... ] }
- The "blocks" array MUST have the EXACT same length and order as the input blocks.
- For each INPUT block:
  - if it is type "image": copy it VERBATIM (same url, caption, preview). Do NOT change or drop images.
  - if it is type "text": rewrite its "text" field according to the instruction (improve grammar, re-frame, expand, condense, etc.). Keep the same "preview" boolean. Preserve Markdown (**bold**, "- " bullets, "## " headings) and bullet-point style.
- Do NOT reorder blocks, do NOT add or remove blocks, do NOT touch images.
- Keep it factual and specific. No disclaimers, no "in conclusion" filler.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId))
    return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    instruction?: string;
  };
  if (!body.instruction || !body.instruction.trim())
    return NextResponse.json({ error: "Instruction is required." }, { status: 400 });

  const row = await db.execute({
    sql: `SELECT id, blocks, kind FROM content WHERE id = ?`,
    args: [numId],
  });
  const item = (row.rows as any[])[0];
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if ((item.kind || "post") !== "post")
    return NextResponse.json({ error: "Only posts can be AI-edited." }, { status: 400 });

  let blocks: any[] = [];
  try {
    const raw = item.blocks
      ? typeof item.blocks === "string"
        ? JSON.parse(item.blocks)
        : item.blocks
      : [];
    blocks = Array.isArray(raw) ? raw : [];
  } catch {
    blocks = [];
  }
  if (!blocks.length)
    return NextResponse.json({ error: "Post has no blocks." }, { status: 400 });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not set." }, { status: 500 });

  const modelName =
    process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://ascendbase.app",
        "X-Title": "ascendbase",
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0.6,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `INSTRUCTION: ${body.instruction.trim()}\n\nCURRENT BLOCKS (JSON):\n${JSON.stringify(
              blocks
            )}`,
          },
        ],
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
    const raw = data?.choices?.[0]?.message?.content || "";
    let parsed: any = {};
    try {
      let s = raw.trim();
      s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start >= 0 && end > start) s = s.slice(start, end + 1);
      parsed = JSON.parse(s || "{}");
    } catch {
      parsed = {};
    }
    const out = Array.isArray(parsed.blocks) ? parsed.blocks : null;
    if (!out || out.length !== blocks.length)
      return NextResponse.json(
        {
          error:
            "AI returned a mismatched block count. Try rephrasing the instruction.",
        },
        { status: 502 }
      );
    // Safety: keep image blocks verbatim from the original (never trust model on urls).
    const merged = out.map((b: any, i: number) => {
      const orig = blocks[i];
      if (orig && orig.type === "image") return orig;
      return {
        type: "text",
        text: typeof b?.text === "string" ? b.text : orig?.text || "",
        preview: !!orig?.preview,
      };
    });
    return NextResponse.json({ ok: true, blocks: merged });
  } catch (e: any) {
    return NextResponse.json(
      { error: `AI edit failed: ${e?.message || e}` },
      { status: 502 }
    );
  }
}