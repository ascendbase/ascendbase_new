import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * AI-assisted vault content generation (OpenRouter, OpenAI-compatible).
 *
 * The agent ONLY produces TEXT blocks in the exact same schema the manual
 * editor uses: { type:"text", text, preview:false }. It does NOT create
 * image blocks — the owner adds those manually in the editor afterwards.
 * The result is saved as a DRAFT post (published=0) nested under the
 * chosen folder, so nothing goes live until the owner reviews, reorders
 * blocks, toggles previews and drops in images.
 */

const SYSTEM = `You are a senior content writer for "ascendbase" — a knowledge base on male facial attractiveness, craniofacial development, and personal facial evaluation (looksmaxing). Write accurate, structured, no-fluff educational content.

You will be given a topic and an access tier. Return ONLY valid JSON (no markdown fences) of this exact shape:
{
  "title": string,
  "blocks": [
    { "type": "text", "text": "string" }
  ]
}

Rules — ALWAYS follow:
- 5-20 text blocks. The FIRST block MUST be a section heading starting with "## " (e.g. "## Bone structure vs soft tissue") — never start the first block with plain paragraph text. Always use clear section headings as their OWN blocks throughout.
- ALWAYS use Markdown inside each block: **bold** for key terms, bullet lists with "- " for points, and "## " for section headings. Use bullet points liberally — they are the default way to present lists and steps.
- Use ONLY the SHORT dash "-" for bullet lists and any dash. NEVER use the long em-dash "—" (or any "–"/"—" character) anywhere in the text — replace it with "-" or rephrase.
- The post TITLE must be in sentence case: ONLY the very first word starts with a capital letter; all other words are lowercase (e.g. "How facial leanness changes your look"). No Title Case, no ALL CAPS.
- Each block is ONE coherent unit (a heading, or a paragraph of 2-5 sentences, or a bullet list). Do not cram everything into one block.
- Follow the INSTRUCTION precisely: if it says summarize, condense; if reformat, restructure; if extract, pull the specific parts requested.
- Keep it factual and specific. No disclaimers, no "in conclusion" filler.`;

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { instruction, sourceText, access, parentId, model } = (await req
    .json()
    .catch(() => ({}))) as {
    instruction?: string;
    sourceText?: string;
    access?: string;
    parentId?: number | null;
    model?: string;
  };
  if (!sourceText || !sourceText.trim())
    return NextResponse.json(
      { error: "Source text is required." },
      { status: 400 }
    );

  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set in env." },
      { status: 500 }
    );

  const accessLevel = ["free", "preview", "paid"].includes(access || "")
    ? access!
    : "free";
  const modelName =
    model || process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

  let blocks: { type: "text"; text: string; preview: boolean }[] = [];
  let title = (instruction || sourceText).trim().slice(0, 80);

  try {
    const r = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // OpenRouter: identify the app (optional but recommended).
          "HTTP-Referer": process.env.APP_URL || "https://ascendbase.app",
          "X-Title": "ascendbase",
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `ACCESS TIER: ${accessLevel}\n\nINSTRUCTION (what to do with the text):\n${
                instruction && instruction.trim()
                  ? instruction.trim()
                  : "Transform this into a well-structured vault lesson post."
              }\n\nSOURCE TEXT:\n${sourceText.trim()}`,
            },
          ],
        }),
      }
    );
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json(
        { error: `OpenRouter error ${r.status}: ${txt.slice(0, 300)}` },
        { status: 502 }
      );
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    // Some models don't support response_format:"json_object" (e.g.
    // tencent/hy3 only allows json_schema), and others wrap the JSON in
    // markdown fences. Parse defensively: strip ``` fences and grab the
    // first balanced {...} object.
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
    if (Array.isArray(parsed.blocks)) {
      blocks = parsed.blocks
        .filter((b: any) => b && typeof b.text === "string" && b.text.trim())
        .map((b: any) => ({
          type: "text" as const,
          text: String(b.text).trim(),
          preview: false,
        }));
    }
    if (typeof parsed.title === "string" && parsed.title.trim())
      title = parsed.title.trim().slice(0, 120);
  } catch (e: any) {
    return NextResponse.json(
      { error: `AI generation failed: ${e?.message || e}` },
      { status: 502 }
    );
  }

  if (!blocks.length)
    return NextResponse.json(
      { error: "AI returned no usable text blocks." },
      { status: 502 }
    );

  const slug = `ai-${Date.now()}`;
  const blocksJson = JSON.stringify(blocks);
  await db.execute({
    sql: `INSERT INTO content (slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, updated_at)
          VALUES (?, ?, '', NULL, ?, 'post', ?, 0, ?, 0, datetime('now'))`,
    args: [slug, title, blocksJson, parentId ?? null, accessLevel],
  });

  return NextResponse.json({ ok: true, title, slug, blocks });
}