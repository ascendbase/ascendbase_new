"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function SiteNav() {
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(null);
  const [planKey, setPlanKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setUser(d?.user || null);
        const sub = d?.subscription;
        // me.subscription is only returned for an active, non-free (or
        // legacy null plan_key) sub, so its presence == paid access.
        setPlanKey(sub && sub.status === "active" ? (sub.planKey || "paid") : null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // "Personal" line is only for the 49 (advice) and 99 (coaching) tiers.
  const isPersonal = planKey === "advice" || planKey === "coaching";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const linkCls = (href: string) =>
    `text-[14px] font-medium transition-colors ${
      pathname === href ? "text-white" : "text-white/55 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[17px] font-bold tracking-tight">
            ascend<span className="text-red-glow">base</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {loading ? null : user ? (
            <>
              <Link href="/dashboard" className={linkCls("/dashboard")}>
                Vault
              </Link>
              <Link href="/subscription" className={linkCls("/subscription")}>
                Account
              </Link>
              {/* Support is for every tier — general app questions. */}
              <Link href="/support" className={linkCls("/support")}>
                Support
              </Link>
              {/* The "Personal" line is only for the 49 & 99 tiers. */}
              {isPersonal && (
                <Link href="/support" className={linkCls("/support")}>
                  Personal
                </Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin" className={linkCls("/admin")}>
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="btn-ghost rounded-full px-4 py-2 text-[13px] font-semibold"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/#benefits" className={`hidden sm:block ${linkCls("/")}`}>
                Benefits
              </Link>
              <Link href="/login" className={`hidden sm:block ${linkCls("/login")}`}>
                Log in
              </Link>
              <Link
                href="/checkout"
                className="btn-red rounded-full px-5 py-2.5 text-[14px] font-semibold"
              >
                Get access
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
