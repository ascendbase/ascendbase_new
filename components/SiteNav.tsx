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
        <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="text-[16px] font-bold tracking-tight sm:text-[17px]">
              ascend<span className="text-red-glow">base</span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-5">
            {loading ? null : user ? (
              <>
                <Link href="/dashboard" className={`${linkCls("/dashboard")} whitespace-nowrap`}>
                  Vault
                </Link>
                <Link href="/subscription" className={`${linkCls("/subscription")} whitespace-nowrap`}>
                  Account
                </Link>
                {/* Free & 19 tiers get the general Support page.
                    49 & 99 tiers get the Personal line instead
                    (their Support == Personal, so we don't show both). */}
                {isPersonal ? (
                  <Link href="/support" className={`${linkCls("/support")} whitespace-nowrap`}>
                    Personal
                  </Link>
                ) : (
                  <Link href="/support" className={`${linkCls("/support")} whitespace-nowrap`}>
                    Support
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link href="/admin" className={`${linkCls("/admin")} whitespace-nowrap`}>
                    Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="btn-ghost shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold sm:px-4 sm:py-2"
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
                  className="btn-red shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold sm:px-5 sm:py-2.5 sm:text-[14px]"
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
