import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  // Fast path: no session cookie → definitely logged out. Skip initDb()
  // (the Turso connect) entirely so first-time / organic visitors get an
  // instant response and the nav resolves without a database round-trip.
  const jar = await cookies();
  if (!jar.get("session")?.value) {
    return NextResponse.json({ user: null });
  }

  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const sub = await getActiveSubscription(user.id);
  if (sub) {
    const s = sub as unknown as {
      status: string;
      expires_at: string | null;
      plan: string | null;
      plan_key: string | null;
    };
    return NextResponse.json({
      user,
      subscription: {
        status: s.status,
        expiresAt: s.expires_at,
        plan: s.plan,
        planKey: s.plan_key,
      },
    });
  }
  // No active PAID sub — but there may be a pending (awaiting your
  // verification) or a free sub. Report it so the UI can show the
  // correct waiting / free state instead of bouncing to checkout.
  const any = await db.execute({
    sql: "SELECT status, plan_key, order_id FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [user.id],
  });
  const row = any.rows[0] as unknown as {
    status: string;
    plan_key: string | null;
    order_id: string;
  } | undefined;
  if (row) {
    return NextResponse.json({
      user,
      subscription: {
        status: row.status,
        expiresAt: null,
        plan: null,
        planKey: row.plan_key,
        orderId: row.order_id,
      },
    });
  }
  return NextResponse.json({ user, subscription: null });
}
