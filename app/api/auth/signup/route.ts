import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { initDb } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await initDb();
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Email and password (min 6 chars) are required." },
      { status: 400 }
    );
  }
  const exists = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  if (exists.rows.length) {
    return NextResponse.json(
      { error: "That email is already registered." },
      { status: 409 }
    );
  }
  const hash = hashPassword(password);
  const r = await db.execute({
    sql: "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')",
    args: [email, hash],
  });
  const userId = Number(r.lastInsertRowid);
  await createSession(userId, "user");
  return NextResponse.json({ ok: true, userId });
}
