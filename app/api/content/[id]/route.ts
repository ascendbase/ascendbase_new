import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  const r = await db.execute({
    sql: "SELECT id, slug, title, body, image_data, blocks, kind, parent_id, order_index, published, access FROM content WHERE id = ?",
    args: [Number(id)],
  });
  if (!r.rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const item = r.rows[0] as unknown as {
    id: number; slug: string | null; title: string; body: string | null;
    image_data: string | null; blocks: string | null; kind: string;
    parent_id: number | null; order_index: number; published: number; access: string;
  };
  const isAdmin = user.role === "admin";
  const isPaid = !!(await getActiveSubscription(user.id));
  const access = item.access || "free";

  // Free-tier gating. We still return the post (title + a short teaser)
  // so the vault can show the title and a blurred preview with an unlock
  // CTA, instead of a hard 403.
  if (!isAdmin && !isPaid) {
    if (access === "paid") {
      let blocks: any[] = [];
      try {
        blocks = item.blocks ? JSON.parse(item.blocks) : [];
      } catch {
        blocks = [];
      }
      return NextResponse.json({
        item: {
          id: item.id,
          title: item.title,
          blocks: blocks.slice(0, 1), // one block as a blurred teaser
          locked: true,
        },
      });
    }
    if (access === "preview") {
      // Send only the blocks the admin flagged as preview (free teaser).
      // Fallback: first 2 blocks if nothing is explicitly flagged.
      let blocks: any[] = [];
      try {
        blocks = item.blocks ? JSON.parse(item.blocks) : [];
      } catch {
        blocks = [];
      }
      const previewBlocks = blocks.filter((b: any) => b.preview);
      const shown = previewBlocks.length ? previewBlocks : blocks.slice(0, 2);
      return NextResponse.json({
        item: {
          id: item.id,
          title: item.title,
          blocks: shown,
          preview: true,
        },
      });
    }
  }
  return NextResponse.json({ item });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const { slug, title, body, image_data, blocks, published, kind, parent_id, order_index, access } = await req
    .json()
    .catch(() => ({}));
  if (!title)
    return NextResponse.json({ error: "title required." }, { status: 400 });
  const blocksJson = blocks ? JSON.stringify(blocks) : null;
  const isFolder = kind === "folder";
  const accessLevel = ["free", "preview", "paid"].includes(access) ? access : "free";
  await db.execute({
    sql: "UPDATE content SET slug=?, title=?, body=?, image_data=?, blocks=?, kind=?, parent_id=?, order_index=?, access=?, published=?, updated_at=datetime('now') WHERE id=?",
    args: [
      isFolder ? null : (slug || null),
      title,
      body || "",
      image_data || null,
      blocksJson,
      isFolder ? "folder" : "post",
      parent_id ?? null,
      order_index ?? 0,
      accessLevel,
      published ? 1 : 0,
      Number(id),
    ],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  // Deleting a folder also removes its descendants.
  const all = await db.execute({ sql: "SELECT id, parent_id FROM content", args: [] });
  const toDelete = new Set<number>([Number(id)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of all.rows as unknown as { id: number; parent_id: number | null }[]) {
      if (row.parent_id !== null && toDelete.has(row.parent_id) && !toDelete.has(row.id)) {
        toDelete.add(row.id);
        changed = true;
      }
    }
  }
  for (const did of toDelete) {
    await db.execute({ sql: "DELETE FROM content WHERE id = ?", args: [did] });
  }
  return NextResponse.json({ ok: true });
}
