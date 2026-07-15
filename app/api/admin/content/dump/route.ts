import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Live, read-only dump of the entire vault (folders + posts with blocks).
 * Admin only. Returns JSON so it can be fetched/inspected in real time
 * without touching the database directly.
 */
export async function GET(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const rows = await db.execute({
    sql: `SELECT id, slug, title, body, image_data, blocks, kind, parent_id, order_index, access, published, updated_at
           FROM content ORDER BY id`,
    args: [],
  });

  const items = (rows.rows as any[]).map((r) => {
    let blocks: any[] = [];
    try {
      const raw = r.blocks ? (typeof r.blocks === "string" ? JSON.parse(r.blocks) : r.blocks) : [];
      blocks = Array.isArray(raw) ? raw : [];
    } catch {
      blocks = [];
    }
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      kind: r.kind || "post",
      parent_id: r.parent_id ?? null,
      order_index: r.order_index ?? 0,
      access: r.access || "free",
      published: !!r.published,
      updated_at: r.updated_at,
      blocks,
    };
  });

  return NextResponse.json({ count: items.length, items });
}