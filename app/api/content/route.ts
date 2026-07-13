import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const sub = await getActiveSubscription(user.id);
  // Freemium: free users (no active sub) still get the tree of
  // published folders + post titles. The actual post content is gated
  // per-item in /api/content/[id] (paid/preview show a blurred teaser).
  // Return a lightweight tree: folders + post titles only. Post bodies/blocks
  // are NOT sent here — they are lazy-loaded via /api/content/[id] on open.
  const where = user.role === "admin" ? "1=1" : "published = 1";
  const rows = await db.execute({
    sql: `SELECT id, slug, title, kind, parent_id, order_index, published, access
          FROM content WHERE ${where}
          ORDER BY kind DESC, order_index ASC, updated_at DESC`,
    args: [],
  });
  return NextResponse.json({ items: rows.rows, accessUntil: sub?.expires_at || null });
}

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { slug, title, body, image_data, blocks, published, kind, parent_id, order_index, access } =
    await req.json().catch(() => ({}));
  if (!title)
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  const isFolder = kind === "folder";
  const accessLevel = ["free", "preview", "paid"].includes(access) ? access : "free";
  const blocksJson = blocks ? JSON.stringify(blocks) : null;
  const finalSlug = isFolder ? null : (slug || `post-${Date.now()}`);
  if (isFolder) {
    await db.execute({
      sql: `INSERT INTO content (title, body, image_data, blocks, kind, parent_id, order_index, access, published, updated_at)
            VALUES (?, ?, ?, ?, 'folder', ?, ?, ?, ?, datetime('now'))`,
      args: [
        title,
        "",
        null,
        null,
        parent_id ?? null,
        order_index ?? 0,
        accessLevel,
        published ? 1 : 0,
      ],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO content (slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, updated_at)
            VALUES (?, ?, ?, ?, ?, 'post', ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(slug) DO UPDATE SET
              title=excluded.title, body=excluded.body,
              image_data=excluded.image_data, blocks=excluded.blocks,
              parent_id=excluded.parent_id, order_index=excluded.order_index,
              access=excluded.access, published=excluded.published, updated_at=datetime('now')`,
      args: [
        finalSlug,
        title,
        body || "",
        image_data || null,
        blocksJson,
        parent_id ?? null,
        order_index ?? 0,
        accessLevel,
        published ? 1 : 0,
      ],
    });
  }
  return NextResponse.json({ ok: true });
}
