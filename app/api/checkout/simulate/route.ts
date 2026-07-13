import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { isSandbox, confirmPayment, createPendingSubscription } from "@/lib/payments";

export const runtime = "nodejs";

// DEV-ONLY (sandbox): simulates a confirmed transfer so the whole flow can be
// exercised locally. Disabled once a real receiving address is configured.
export async function POST(req: NextRequest) {
  await initDb();
  if (!isSandbox()) {
    return NextResponse.json(
      { error: "Simulate is only available in sandbox mode." },
      { status: 400 }
    );
  }
  const { orderId, amount, planKey, coin, net, userId } = await req
    .json()
    .catch(() => ({}));
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }
  // The pending sub is only written on real hash-submit now, so for the
  // sandbox simulate we create it here first (mimics "user sent + pasted
  // hash"), then confirm it as paid.
  const existing = await db.execute({
    sql: "SELECT id FROM subscriptions WHERE order_id = ?",
    args: [orderId],
  });
  if (!existing.rows.length) {
    await createPendingSubscription({
      userId: Number(userId) || 0,
      orderId,
      amount: Number(amount) || 0,
      planKey: planKey || null,
      coin: coin || "USDT",
      net: net || "TRC20",
      txHash: "sandbox_simulated",
    });
  }
  await confirmPayment(orderId);
  return NextResponse.json({ ok: true });
}
