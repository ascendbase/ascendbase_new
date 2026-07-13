import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
