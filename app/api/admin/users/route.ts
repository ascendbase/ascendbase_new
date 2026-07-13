import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const users = await db.execute(
    `SELECT u.id, u.email, u.role, u.created_at,
            (SELECT status FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_status,
            (SELECT expires_at FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_expires,
            (SELECT plan_key FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_plan_key,
            (SELECT amount FROM subscriptions s WHERE s.user_id=u.id ORDER BY s.created_at DESC LIMIT 1) as sub_amount
     FROM users u ORDER BY u.created_at DESC`
  );
  return NextResponse.json({ users: users.rows });
}
