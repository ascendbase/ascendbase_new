import { db } from "./db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please"
);

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

export async function createSession(userId: number, role: string) {
  const token = await new SignJWT({ uid: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { uid: payload.uid as number, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete("session");
}

export type CurrentUser = { id: number; email: string; role: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await getSession();
  if (!s) return null;
  const r = await db.execute({
    sql: "SELECT id, email, role FROM users WHERE id = ?",
    args: [s.uid],
  });
  if (!r.rows.length) return null;
  const row = r.rows[0] as unknown as { id: number; email: string; role: string };
  return { id: row.id, email: row.email, role: row.role };
}

export async function getActiveSubscription(userId: number) {
  const r = await db.execute({
    sql: "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1",
    args: [userId],
  });
  return r.rows[0] || null;
}
