import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * AI-edit an EXISTING post.
 *
 * Two modes, decided by the instruction text:
 *
 * 1) EDIT mode (default) — rewrite the existing text blocks in place.
 *    The model keeps the same number/order of blocks, never touches
 *    images, and returns the full block array.
 *
 * 2) ADD mode — triggered ONLY when the instruction explicitly asks to
 *    "add new text block(s)". The model returns the ORIGINAL blocks
 *    array UNCHANGED, then APPENDS new text blocks AFTER all existing
 *    ones. Images are never altered or moved.
 *
 * Nothing is saved until the admin clicks Save in the editor.
 */
const FORMAT_RULES = `
FORMAT RULES — apply to every text block you produce (rewritten OR new):
- The FIRST block MUST be a section heading starting with "## " (e.g. "## Bone structure vs soft tissue") — never start the first block with plain paragraph text. Always use clear section headings as their OWN blocks throughout.
- ALWAYS use Markdown inside each block: **bold** for key terms, bullet lists with "- " for points, and "## " for section headings. Use bullet points liberally — they are the default way to present lists and steps.
- Use ONLY the SHORT dash "-" for bullet lists and any dash. NEVER use the long em-dash "—" (or any "–"/"—" character) anywhere in the text — replace it with "-" or rephrase.
- The post TITLE must be in sentence case: ONLY the very first word starts with a capital letter; all other words are lowercase (e.g. "How facial leanness changes your look"). No Title Case, no ALL CAPS.
- Each block is ONE coherent unit (a heading, or a paragraph of 2-5 sentences, or a bullet list). Do not cram everything into one block.
- Follow the INSTRUCTION precisely: if it says summarize, condense; if reformat, restructure; if extract, pull the specific parts requested.
- Keep it factual and specific. No disclaimers, no "in conclusion" filler.`;

const EDIT_SYSTEM = `You are a senior editor for "ascendbase" — a knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing).

You are given an EXISTING post made of blocks and an INSTRUCTION on how to rewrite it. Rewrite the post per the instruction.

Rules — STRICTLY follow:
- Return ONLY valid JSON (no markdown fences) of this exact shape:
  { "blocks": [ ... ] }
- The "blocks" array MUST have the EXACT same length and order as the input blocks.
- For each INPUT block:
  - if it is type "image": copy it VERBATIM (same url, caption, preview). Do NOT change or drop images.
  - if it is type "text": rewrite its "text" field according to the instruction (improve grammar, re-frame, expand, condense, etc.). Keep the same "preview" boolean.
- Do NOT reorder blocks, do NOT add or remove blocks, do NOT touch images.${FORMAT_RULES}`;

const ADD_SYSTEM = `You are a senior editor for "ascendbase" — a knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing).

You are given an EXISTING post made of blocks and an INSTRUCTION that explicitly asks you to ADD NEW text content.

Rules — STRICTLY follow:
- Return ONLY valid JSON (no markdown fences) of this exact shape:
  { "blocks": [ ... ] }
- The "blocks" array MUST start with the EXACT ORIGINAL blocks, in the SAME order, COMPLETELY UNCHANGED (copy every field verbatim — type, text, url, caption, preview). Do NOT edit, reword, reorder, or drop any original block.
- AFTER all the original blocks, APPEND ONLY NEW text blocks that the instruction asks for. Each new block must be:
  { "type": "text", "text": "<the new content>", "preview": false }
- Do NOT add image blocks. Do NOT modify any original block.
- The total length must be (original length + number of new blocks you added).${FORMAT_RULES}`;

// Explicit "add" intent — only then do we switch to ADD mode.
function isAddIntent(instruction: string): boolean {
  const s = instruction.toLowerCase();
  const add = /\badd\b/.test(s) && /(new|extra|additional|more|another)\b/.test(s);
  const block = /\b(block|section|paragraph|text)\b/.test(s);
  return add && block;
}

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

  const addMode = isAddIntent(body.instruction);
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
          { role: "system", content: addMode ? ADD_SYSTEM : EDIT_SYSTEM },
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
    if (!out) {
      return NextResponse.json(
        { error: "AI returned no blocks. Try rephrasing the instruction." },
        { status: 502 }
      );
    }

    if (addMode) {
      // Must keep every original block verbatim, then append new text blocks.
      if (out.length < blocks.length) {
        return NextResponse.json(
          { error: "AI dropped original blocks. Try again." },
          { status: 502 }
        );
      }
      // Verify the first N blocks match the originals (type + image url).
      for (let i = 0; i < blocks.length; i++) {
        const o = blocks[i];
        const n = out[i];
        if (!n || n.type !== o.type) {
          return NextResponse.json(
            { error: "AI altered an original block. Try again." },
            { status: 502 }
          );
        }
        if (o.type === "image" && n.url !== o.url) {
          return NextResponse.json(
            { error: "AI altered an image block. Try again." },
            { status: 502 }
          );
        }
      }
      const added = out.slice(blocks.length).map((b: any) => ({
        type: "text",
        text: typeof b?.text === "string" ? b.text : "",
        preview: false,
      }));
      if (!added.length || added.some((b: any) => !b.text.trim())) {
        return NextResponse.json(
          { error: "AI returned no usable new text blocks." },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, blocks: out, added: added.length });
    }

    // EDIT mode: same count, images verbatim.
    if (out.length !== blocks.length) {
      return NextResponse.json(
        {
          error:
            "AI returned a mismatched block count. Try rephrasing the instruction.",
        },
        { status: 502 }
      );
    }
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