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

  // Loading state: a minimal, NON-interactive placeholder with a clear
  // status line. No mockup buttons — this prevents mis-clicks while the
  // real nav (which depends on auth state) is still resolving.
  if (loading) {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:h-16 sm:px-8">
          <span className="text-[16px] font-bold tracking-tight sm:text-[17px]">
            ascend<span className="text-red-glow">base</span>
          </span>
          <span className="animate-pulse text-[13px] font-medium text-white/40">
            Loading the project elements…
          </span>
        </div>
      </header>
    );
  }

  const linkCls = (href: string) =>
    `text-[14px] font-medium transition-colors ${
      pathname === href ? "text-white" : "text-white/55 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
      <nav className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:h-16 sm:items-center sm:justify-between sm:gap-2 sm:py-0 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-[16px] font-bold tracking-tight sm:text-[17px]">
            ascend<span className="text-red-glow">base</span>
          </span>
        </Link>

        {/* Render the nav immediately (public links while the auth check is
            still loading) so the bar is never blank. User-specific links
            swap in once `user` resolves. */}
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-x-4 gap-y-2 sm:justify-end sm:gap-x-5">
          {user ? (
            <>
              <Link href="/dashboard" className={`${linkCls("/dashboard")} whitespace-nowrap py-1`}>
                Vault
              </Link>
              <Link href="/ratios" className={`${linkCls("/ratios")} whitespace-nowrap py-1`}>
                Ratios
              </Link>
              <Link href="/subscription" className={`${linkCls("/subscription")} whitespace-nowrap py-1`}>
                Account
              </Link>
              {/* Free & 19 tiers get the general Support page.
                   49 & 99 tiers get the Personal line instead
                   (their Support == Personal, so we don't show both). */}
              {isPersonal ? (
                <Link href="/support" className={`${linkCls("/support")} whitespace-nowrap py-1`}>
                  Personal
                </Link>
              ) : (
                <Link href="/support" className={`${linkCls("/support")} whitespace-nowrap py-1`}>
                  Support
                </Link>
              )}
              <Link href="/connect" className={`${linkCls("/connect")} whitespace-nowrap py-1`}>
                Connect
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className={`${linkCls("/admin")} whitespace-nowrap py-1`}>
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="btn-ghost shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/#benefits" className={`hidden sm:block ${linkCls("/")} py-1`}>
                Benefits
              </Link>
               <Link href="/login" className={`${linkCls("/login")} whitespace-nowrap py-1`}>
                  Log in
                </Link>
                <Link href="/connect" className={`${linkCls("/connect")} whitespace-nowrap py-1`}>
                  Connect
                </Link>
                <Link
                 href="/signup"
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
