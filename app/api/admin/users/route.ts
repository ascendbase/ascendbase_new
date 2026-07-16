import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const RANGES: Record<string, string> = {
  "7d": "datetime('now', '-7 days')",
  "30d": "datetime('now', '-30 days')",
  "90d": "datetime('now', '-90 days')",
  all: "'0001-01-01'",
};

export async function GET(req: Request) {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const url = new URL(req.url);
  const range = RANGES[url.searchParams.get("range") || "all"] || RANGES.all;
  // Signups within the timeframe.
  const signups = await db.execute({
    sql: `SELECT COUNT(*) as c FROM users u WHERE u.created_at >= ${range}`,
    args: [],
  });
  // Paid subscriptions (active) within the timeframe, grouped by plan_key.
  const paid = await db.execute({
    sql: `SELECT COALESCE(plan_key, 'paid') as plan_key, COUNT(*) as c
           FROM subscriptions s
           WHERE s.status = 'active' AND s.created_at >= ${range}
           GROUP BY plan_key`,
    args: [],
  });
  const paidMap: Record<string, number> = {};
  for (const r of paid.rows as any[]) paidMap[r.plan_key] = Number(r.c);

  const users = await db.execute(
    `SELECT u.id, u.email, u.role, u.created_at,
            (SELECT status FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_status,
            (SELECT expires_at FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_expires,
            (SELECT plan_key FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_plan_key,
            (SELECT amount FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_amount,
            (SELECT tx_hash FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_tx_hash,
            (SELECT network FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_network
     FROM users u ORDER BY u.created_at DESC`
  );
  return NextResponse.json({
    users: users.rows,
    stats: {
      range: url.searchParams.get("range") || "all",
      totalSignups: Number((signups.rows[0] as any).c),
      paid19: paidMap["19"] || 0,
      paid49: paidMap["49"] || 0,
      paid99: paidMap["99"] || 0,
    },
  });
}
