import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createInvoice } from "@/lib/payments";
import { getPlan, PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    coin?: string;
    net?: string;
    planKey?: string;
  };
  const plan = getPlan(body.planKey) || PLANS[0];
  const amount = plan.price;
  const invoice = await createInvoice({
    userId: user.id,
    amount,
    planKey: plan.key,
    coin: body.coin,
    net: body.net,
  });
  return NextResponse.json(invoice);
}
