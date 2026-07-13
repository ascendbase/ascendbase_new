import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { isSandbox, confirmPayment, verifyWebhook } from "@/lib/payments";

export const runtime = "nodejs";

// A crypto processor (NowPayments / BTCPay Server / etc.) posts payment
// confirmations here. In sandbox this is also what the "Simulate payment"
// button effectively triggers (via the DB directly).
export async function POST(req: NextRequest) {
  await initDb();
  const raw = await req.text();
  const signature = req.headers.get("x-payment-sign");
  const ok = await verifyWebhook(raw, signature);
  if (!ok && !isSandbox()) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  let body: any = {};
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    body = {};
  }
  const orderId = body.merchantOrderId || body.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "No orderId in payload." }, { status: 400 });
  }
  await confirmPayment(orderId, {
    txHash: body.txHash || body.txid || body.transactionHash,
    network: body.coin || body.network,
  });
  return NextResponse.json({ ok: true });
}
