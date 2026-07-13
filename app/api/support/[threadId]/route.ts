import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { threadId } = await params;
  const tid = Number(threadId);
  const t = await db.execute({
    sql: "SELECT * FROM support_threads WHERE id = ?",
    args: [tid],
  });
  if (!t.rows.length)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  const row = t.rows[0] as unknown as { user_id: number };
  if (user.role !== "admin" && row.user_id !== user.id)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const msgs = await db.execute({
    sql: "SELECT * FROM support_messages WHERE thread_id = ? ORDER BY id ASC",
    args: [tid],
  });
  return NextResponse.json({ messages: msgs.rows });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  // Only admins can delete threads.
  if (user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { threadId } = await params;
  const tid = Number(threadId);
  if (!tid) return NextResponse.json({ error: "Bad id." }, { status: 400 });

  // Collect every image URL in this thread's messages, then delete them
  // from storage (local file or Vercel Blob) permanently.
  const msgs = await db.execute({
    sql: "SELECT image_url FROM support_messages WHERE thread_id = ? AND image_url IS NOT NULL",
    args: [tid],
  });
  for (const m of msgs.rows as unknown as { image_url: string }[]) {
    await deleteImage(m.image_url);
  }
  // Delete messages first (FK), then the thread itself.
  await db.execute({
    sql: "DELETE FROM support_messages WHERE thread_id = ?",
    args: [tid],
  });
  await db.execute({
    sql: "DELETE FROM support_threads WHERE id = ?",
    args: [tid],
  });
  return NextResponse.json({ ok: true });
}
