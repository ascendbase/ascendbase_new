import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getPlan, PLANS } from "@/lib/plans";

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
  const { action, planKey } = await req.json().catch(() => ({}));
  const uid = Number(id);

  if (action === "grant") {
    // Assign a REAL paid plan so the user is recognized as paid everywhere
    // (nav "Personal", support tier, vault gating). Defaults to the first
    // paid plan if none specified.
    const plan = getPlan(planKey) || PLANS[0];
    const days = plan.days;
    const expires = new Date(Date.now() + days * 86400000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    await db.execute({
      sql: "INSERT INTO subscriptions (user_id, status, plan, amount, coin, expires_at, plan_key) VALUES (?, 'active', ?, ?, ?, ?, ?)",
      args: [uid, plan.key, plan.price, "USDT", expires, plan.key],
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
