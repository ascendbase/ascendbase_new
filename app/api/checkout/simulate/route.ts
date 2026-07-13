import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { isSandbox, confirmPayment } from "@/lib/payments";

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
  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }
  await confirmPayment(orderId);
  return NextResponse.json({ ok: true });
}
