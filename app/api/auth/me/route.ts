import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getCurrentUser, getActiveSubscription } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  await initDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const sub = await getActiveSubscription(user.id);
  return NextResponse.json({
    user,
    subscription: sub
      ? {
          status: sub.status,
          expiresAt: sub.expires_at,
          plan: sub.plan,
          planKey: sub.plan_key,
        }
      : null,
  });
}
