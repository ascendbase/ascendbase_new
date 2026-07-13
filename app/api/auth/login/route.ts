import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await initDb();
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  const r = await db.execute({
    sql: "SELECT id, password_hash, role FROM users WHERE email = ?",
    args: [email],
  });
  if (!r.rows.length) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const u = r.rows[0] as unknown as { id: number; password_hash: string; role: string };
  if (!verifyPassword(password, u.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  await createSession(u.id, u.role);
  return NextResponse.json({ ok: true, role: u.role });
}
