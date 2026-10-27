import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getLavaInvoice } from "@/lib/lava";
import {
  confirmPayment,
  createPendingSubscription,
} from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Fallback sync: if the Lava webhook didn't fire, the client can call this
 * endpoint with the orderId. We look up the invoice, check the contract
 * status directly on Lava's API, and activate if the payment succeeded.
 * Auth: the caller must be the same user who created the invoice.
 */
export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { orderId?: string };
  const orderId = body.orderId;
  if (!orderId) return NextResponse.json({ error: "Missing orderId." }, { status: 400 });

  // Find our invoice for this user and check it hasn't already been activated.
  const inv = await db.execute({
    sql: "SELECT contract_id, order_id, user_id, plan_key, amount, renewal, status FROM invoices WHERE order_id = ? AND user_id = ? AND provider = 'lava'",
    args: [orderId, user.id],
  });
  const row = inv.rows[0] as unknown as
    | {
        contract_id: string;
        order_id: string;
        user_id: number;
        plan_key: string | null;
        amount: number;
        renewal: number;
        status: string;
      }
    | undefined;
  if (!row) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (row.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (!row.contract_id) return NextResponse.json({ error: "No Lava contract on this invoice." }, { status: 400 });

  // Check the contract status directly on Lava's API.
  const lavaInv = await getLavaInvoice(row.contract_id);
  if (!lavaInv) return NextResponse.json({ error: "Could not reach Lava API." }, { status: 502 });

  // If the contract is still "new" (unpaid), tell the client to keep waiting.
  if (lavaInv.status === "new" || !lavaInv.status) {
    return NextResponse.json({ paid: false, status: lavaInv.status });
  }
  // If the contract is in a failed/cancelled state, report that.
  if (lavaInv.status !== "success" && lavaInv.status !== "paid") {
    return NextResponse.json({ paid: false, status: lavaInv.status });
  }

  // Payment succeeded on Lava's side — activate the subscription.
  await db.execute({
    sql: "UPDATE invoices SET status='paid' WHERE order_id = ?",
    args: [row.order_id],
  });
  await createPendingSubscription({
    userId: row.user_id,
    orderId: row.order_id,
    amount: lavaInv.amountTotal?.amount || row.amount,
    planKey: row.plan_key || "vault",
    coin: "USD",
    net: "card",
    renewal: !!row.renewal,
  });
  await confirmPayment(row.order_id, {
    txHash: row.contract_id,
    network: "lava",
  });

  return NextResponse.json({ paid: true });
}
