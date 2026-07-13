import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Activate the free tier for the current user (no payment). Creates an
// active "free" subscription so the vault opens immediately.
export async function POST(_req: NextRequest) {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // If the user already has any subscription, just confirm free access.
  const existing = await db.execute({
    sql: "SELECT id FROM subscriptions WHERE user_id = ? LIMIT 1",
    args: [user.id],
  });
  if (existing.rows.length) {
    return NextResponse.json({ ok: true });
  }

  await db.execute({
    sql: "INSERT INTO subscriptions (user_id, status, plan, plan_key, expires_at) VALUES (?, 'active', 'free', 'free', NULL)",
    args: [user.id],
  });
  return NextResponse.json({ ok: true });
}