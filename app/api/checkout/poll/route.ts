import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { verifyInvoiceOnChain } from "@/lib/verify";
import { createPendingSubscription, confirmPayment } from "@/lib/payments";
import { getPlan } from "@/lib/plans";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Automatic payment verification polling endpoint.
 * The checkout page calls this every ~15 seconds while an invoice is open.
 * When the member's exact tagged USDT amount lands in the receiving wallet,
 * the pending subscription is created and confirmed here — access is granted
 * with zero manual admin work.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { orderId?: string };
  const orderId = body.orderId;
  if (!orderId) return NextResponse.json({ error: "Missing orderId." }, { status: 400 });

  // The invoice must belong to the authenticated user.
  const inv = await db.execute({
    sql: "SELECT order_id, plan_key, status FROM invoices WHERE order_id = ? AND user_id = ?",
    args: [orderId, user.id],
  });
  const row = inv.rows[0] as unknown as
    | { order_id: string; plan_key: string | null; status: string }
    | undefined;
  if (!row) return NextResponse.json({ found: false });

  // Cheap rate limit: skip the on-chain API if we checked < 8s ago.
  const checked = await db.execute({
    sql: "SELECT checked_at FROM invoices WHERE order_id = ?",
    args: [orderId],
  });
  const checkedAt = Number((checked.rows[0] as unknown as { checked_at: number }).checked_at);
  const now = Date.now();
  if (now - checkedAt < 8_000) return NextResponse.json({ found: false, skipped: true });
  await db.execute({ sql: "UPDATE invoices SET checked_at = ? WHERE order_id = ?", args: [now, orderId] });

  const res = await verifyInvoiceOnChain(orderId);
  if (!res.found || !res.txHash) return NextResponse.json({ found: false });

  const plan = getPlan(row.plan_key || "");
  if (!plan) return NextResponse.json({ found: false, error: "Unknown plan." }, { status: 400 });

  // Create + confirm the subscription in one shot (idempotent for this order).
  await createPendingSubscription({
    userId: user.id,
    planKey: plan.key,
    orderId,
    txHash: res.txHash,
    coin: "USDT",
    net: "TRC20",
    amount: plan.price,
  });
  // confirmPayment derives duration and expiry from the plan itself.
  await confirmPayment(orderId, { txHash: res.txHash, network: "TRC20" });
  return NextResponse.json({ found: true });
}
