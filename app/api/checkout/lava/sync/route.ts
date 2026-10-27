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
  if (!lavaInv) {
    console.error(`[lava sync] Could not reach Lava API for contract ${row.contract_id}`);
    return NextResponse.json({ error: "Could not reach Lava API." }, { status: 502 });
  }

  console.log(`[lava sync] contract ${row.contract_id} status: ${lavaInv.status}`);

  // If the contract is still "new" (unpaid), tell the client to keep waiting.
  const paidStatuses = ["success", "paid", "completed", "confirmed", "succeeded", "done"];
  const failedStatuses = ["error", "cancelled", "canceled", "expired", "declined"];
  const status = (lavaInv.status || "").toLowerCase();

  if (failedStatuses.includes(status)) {
    console.log(`[lava sync] contract ${row.contract_id} explicitly failed: ${status}`);
    await db.execute({
      sql: "UPDATE invoices SET status='failed' WHERE order_id = ? AND status = 'open'",
      args: [row.order_id],
    });
    return NextResponse.json({ paid: false, status });
  }

  if (status === "new" || !status) {
    return NextResponse.json({ paid: false, status: status || "unknown" });
  }

  // Any other status that isn't explicitly "failed" is treated as potentially
  // paid. This is aggressive but safer than losing a real customer to a
  // status-name mismatch between our code and Lava's API.
  if (!paidStatuses.includes(status)) {
    console.warn(
      `[lava sync] contract ${row.contract_id} has UNEXPECTED status "${status}" — treating as paid`
    );
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
