import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * The member submits the transaction hash (TX id) of the transfer they made.
 * This is the proof-of-payment that lets the owner match a received transfer
 * to the exact user — every on-chain transaction has a unique hash, so two
 * users who both requested the same 49 USDT tier can be told apart by their
 * distinct TX hashes. Stored on the pending subscription row.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { orderId, txHash } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: "orderId required." }, { status: 400 });
  if (!txHash || !String(txHash).trim())
    return NextResponse.json({ error: "Transaction hash required." }, { status: 400 });

  const clean = String(txHash).trim();
  // Only attach to THIS user's own pending sub (no cross-user writes).
  const r = await db.execute({
    sql: "UPDATE subscriptions SET tx_hash = ? WHERE order_id = ? AND user_id = ? AND status = 'pending'",
    args: [clean, orderId, user.id],
  });
  if (!r.rowsAffected)
    return NextResponse.json({ error: "No pending order found for you." }, { status: 404 });

  return NextResponse.json({ ok: true });
}