import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPendingSubscription } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * The member submits the transaction hash (TX id) of the transfer they made.
 * This is the proof-of-payment that lets the owner match a received transfer
 * to the exact user — every on-chain transaction has a unique hash, so two
 * users who both requested the same 49 USDT tier can be told apart by their
 * distinct TX hashes.
 *
 * IMPORTANT: the pending subscription row is created HERE, only after the
 * user has genuinely sent the payment and pasted their hash. Before this
 * call nothing is written, so the request does NOT appear in the owner's
 * admin panel and no "awaiting verification" state is shown prematurely.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { orderId, txHash, amount, planKey, coin, net } = await req
    .json()
    .catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: "orderId required." }, { status: 400 });
  if (!txHash || !String(txHash).trim())
    return NextResponse.json({ error: "Transaction hash required." }, { status: 400 });

  const clean = String(txHash).trim();

  // Guard: don't create a duplicate pending sub for the same order.
  const existing = await db.execute({
    sql: "SELECT id FROM subscriptions WHERE order_id = ? AND user_id = ?",
    args: [orderId, user.id],
  });
  if (!existing.rows.length) {
    await createPendingSubscription({
      userId: user.id,
      orderId,
      amount: Number(amount) || 0,
      planKey: planKey || null,
      coin: coin || "USDT",
      net: net || "TRC20",
      txHash: clean,
    });
  } else {
    // Already exists (e.g. re-submit) — just refresh the hash.
    await db.execute({
      sql: "UPDATE subscriptions SET tx_hash = ? WHERE order_id = ? AND user_id = ?",
      args: [clean, orderId, user.id],
    });
  }

  return NextResponse.json({ ok: true });
}
