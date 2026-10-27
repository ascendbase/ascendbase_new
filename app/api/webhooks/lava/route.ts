import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import {
  confirmPayment,
  createPendingSubscription,
} from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Lava.top webhook receiver.
 *
 * Lava POSTs JSON like:
 *   {
 *     eventType: "payment.success" | "payment.failed" |
 *                "subscription.recurring.payment.success" | ...,
 *     contractId, parentContractId?, buyer: { email },
 *     amount, currency, status, timestamp, errorMessage
 *   }
 * Auth: X-Api-Key header (same account key). We verify it against env
 * LAVA_WEBHOOK_KEY (or LAVA_API_KEY) and ignore anything else.
 *
 * On payment.success: find our invoices row by contractId, create the
 * pending subscription (renewal-aware) and confirm it — access opens
 * instantly with no admin step.
 */
export async function POST(req: NextRequest) {
  await initDb();

  const key = req.headers.get("x-api-key") || "";
  const expected =
    process.env.LAVA_WEBHOOK_KEY || process.env.LAVA_API_KEY || "";
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    eventType?: string;
    contractId?: string;
    parentContractId?: string;
    buyer?: { email?: string };
    amount?: number;
    currency?: string;
    status?: string;
    errorMessage?: string;
  };

  const eventType = body.eventType || "";
  const contractId = body.contractId || body.parentContractId || "";
  if (!contractId) {
    return NextResponse.json({ error: "No contractId in payload." }, { status: 400 });
  }

  // Only success events activate access. Failed/error events get logged
  // but don't create subscription rows (unless the user asked for it).
  const isPurchaseSuccess = eventType === "payment.success";
  const isRecurringSuccess =
    eventType === "subscription.recurring.payment.success";
  const isPaymentFailed = eventType === "payment.failed";
  if (!isPurchaseSuccess && !isRecurringSuccess) {
    if (isPaymentFailed) {
      // Log the failure but don't create a subscription row — the buyer
      // can retry. We still check if we have a matching invoice row and
      // update its status so the admin panel can see it.
      await db.execute({
        sql: "UPDATE invoices SET status='failed' WHERE contract_id = ? AND provider = 'lava' AND status = 'open'",
        args: [contractId],
      });
      console.error(
        `[lava webhook] payment.failed contract=${contractId} buyer=${body.buyer?.email || "?"} err=${body.errorMessage || "unknown"}`
      );
    }
    return NextResponse.json({ ok: true, ignored: eventType || "unknown" });
  }

  // Match the Lava contract to our invoice row.
  const inv = await db.execute({
    sql: "SELECT order_id, user_id, plan_key, amount, renewal, status FROM invoices WHERE contract_id = ? AND provider = 'lava' LIMIT 1",
    args: [contractId],
  });
  const row = inv.rows[0] as unknown as
    | {
        order_id: string;
        user_id: number;
        plan_key: string | null;
        amount: number;
        renewal: number;
        status: string;
      }
    | undefined;

  if (!row) {
    // Unknown contract (e.g. a renewal bought directly from a Lava page).
    // Log for manual reconciliation; never grant access blindly.
    console.error(
      `[lava webhook] unmatched contract ${contractId} buyer=${
        body.buyer?.email || "?"
      } amount=${body.amount}`
    );
    return NextResponse.json({ ok: true, matched: false });
  }

  if (row.status === "paid") {
    // Idempotent: duplicate webhooks must not double-extend.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await db.execute({
    sql: "UPDATE invoices SET status='paid' WHERE order_id = ?",
    args: [row.order_id],
  });

  const amount = Number(body.amount ?? row.amount) || row.amount;
  await createPendingSubscription({
    userId: row.user_id,
    orderId: row.order_id,
    amount,
    planKey: row.plan_key || "vault",
    coin: "USD",
    net: "card",
    renewal: !!row.renewal,
  });
  await confirmPayment(row.order_id, {
    txHash: contractId,
    network: "lava",
  });

  return NextResponse.json({ ok: true, activated: true });
}
