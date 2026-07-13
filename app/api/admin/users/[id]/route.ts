import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  const uid = Number(id);

  if (action === "grant") {
    const days = parseInt(process.env.ACCESS_DAYS || "30", 10);
    const expires = new Date(Date.now() + days * 86400000).toISOString();
    await db.execute({
      sql: "INSERT INTO subscriptions (user_id, status, plan, amount, coin, expires_at) VALUES (?, 'active', 'manual', 0, 'manual', ?)",
      args: [uid, expires],
    });
    return NextResponse.json({ ok: true });
  }
  if (action === "revoke") {
    await db.execute({
      sql: "UPDATE subscriptions SET status='cancelled', expires_at=datetime('now') WHERE user_id=? AND status='active'",
      args: [uid],
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
