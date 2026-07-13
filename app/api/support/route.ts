import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  if (user.role === "admin") {
    const threads = await db.execute(
      `SELECT t.id, t.user_id, t.subject, t.status, t.updated_at, u.email as user_email,
              (SELECT body FROM support_messages m WHERE m.thread_id=t.id ORDER BY m.id DESC LIMIT 1) as last_msg
       FROM support_threads t JOIN users u ON u.id=t.user_id
       ORDER BY t.updated_at DESC`
    );
    return NextResponse.json({ threads: threads.rows });
  }

  const threads = await db.execute({
    sql: "SELECT * FROM support_threads WHERE user_id = ? ORDER BY updated_at DESC",
    args: [user.id],
  });
  return NextResponse.json({ threads: threads.rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { threadId, subject, body, imageUrl } = await req.json().catch(() => ({}));
  if ((!body || !body.trim()) && !imageUrl)
    return NextResponse.json({ error: "Message required." }, { status: 400 });

  if (user.role === "admin") {
    if (!threadId)
      return NextResponse.json({ error: "threadId required." }, { status: 400 });
    await db.execute({
      sql: "INSERT INTO support_messages (thread_id, sender, body, image_url) VALUES (?, 'admin', ?, ?)",
      args: [Number(threadId), body || "", imageUrl || null],
    });
    await db.execute({
      sql: "UPDATE support_threads SET status='answered', updated_at=datetime('now') WHERE id=?",
      args: [Number(threadId)],
    });
    return NextResponse.json({ ok: true });
  }

  let tid: number = threadId ? Number(threadId) : 0;
  if (!tid) {
    const r = await db.execute({
      sql: "INSERT INTO support_threads (user_id, subject, status) VALUES (?, ?, 'open')",
      args: [user.id, subject || "Support request"],
    });
    tid = Number(r.lastInsertRowid);
  }
  await db.execute({
    sql: "INSERT INTO support_messages (thread_id, sender, body, image_url) VALUES (?, 'user', ?, ?)",
    args: [tid, body || "", imageUrl || null],
  });
  await db.execute({
    sql: "UPDATE support_threads SET updated_at=datetime('now') WHERE id=?",
    args: [tid],
  });
  return NextResponse.json({ ok: true, threadId: tid });
}
