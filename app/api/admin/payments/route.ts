import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { confirmPayment } from "@/lib/payments";

export const runtime = "nodejs";

// List pending payments (for manual verification) and approve/grant access.
export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const rows = await db.execute(
    `SELECT s.order_id, s.plan_key, s.amount, s.coin, s.network, s.tx_hash, s.created_at, u.email
     FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'pending' ORDER BY s.created_at DESC`
  );
  return NextResponse.json({ payments: rows.rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { orderId, txHash, network } = await req.json().catch(() => ({}));
  if (!orderId)
    return NextResponse.json({ error: "orderId required." }, { status: 400 });

  await confirmPayment(orderId, { txHash, network });
  return NextResponse.json({ ok: true });
}
