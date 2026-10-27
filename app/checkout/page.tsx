"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, GhostButton, Badge } from "@/components/ui";
import { PLANS, FREE_PLAN, getPlan, type Plan, RENEW_PRICE } from "@/lib/plans";

export default function CheckoutPage() {
  const router = useRouter();
  function PriceBlock({ p, big = false }: { p: Plan; big?: boolean }) {
    const sale = p.salePrice;
    const green = big ? "text-2xl" : "text-xl";
    if (sale != null && sale !== p.price) {
      return (
        <span className="flex items-baseline gap-2">
          <span className={`font-black ${green} text-green-glow`}>${sale}</span>
          <span className="text-sm text-white/40 line-through">${p.price}</span>
        </span>
      );
    }
    return <span className={`font-black ${green} text-green-glow`}>${p.price}</span>;
  }
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [selPlan, setSelPlan] = useState<string>("free");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [upgradeFrom, setUpgradeFrom] = useState<string | null>(null);
  const [renewMode, setRenewMode] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.ok ? r.json() : null);
      if (!me || !me.user) { router.replace("/login"); return; }
      const params = new URLSearchParams(window.location.search);
      const upParam = params.get("upgrade");
      const renewParam = params.get("renew") === "1";
      if (me.subscription && me.subscription.status === "active" && !upParam && !renewParam) {
        router.replace("/dashboard"); return;
      }
      if (renewParam) { setRenewMode(true); setSelPlan("vault"); }
      if (params.get("lava_return")) { setPaid(true); }
      const planParam = params.get("plan");
      if (planParam && getPlan(planParam) && !renewParam) { setSelPlan(planParam); }
      const up = upParam;
      if (up && !renewParam) {
        const cur = getPlan(up);
        const higher = PLANS.filter((p) => (cur ? p.price > cur.price : true));
        if (higher.length) {
          setUpgradeFrom(up);
          setSelPlan(higher.sort((a, b) => a.price - b.price)[0].key);
        }
      }
      setState("ready");
    })();
  }, [router]);

  async function payWithCard() {
    setBusy(true); setError("");
    const r = await fetch("/api/checkout/lava", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey: selPlan, renew: renewMode || undefined }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { setError(data.error || "Card payment is unavailable right now."); return; }
    if (data.url) window.location.href = data.url;
  }

  async function activateFree() {
    setBusy(true); setError("");
    const r = await fetch("/api/checkout/free", { method: "POST" });
    setBusy(false);
    if (r.ok) router.replace("/dashboard");
    else { const d = await r.json().catch(() => ({})); setError(d.error || "Could not activate free access."); }
  }

  useEffect(() => {
    if (!paid) return;
    let alive = true;
    // First: try the sync fallback (checks Lava's API directly) to activate
    // the sub even if the webhook didn't fire. Then poll /api/auth/me.
    const lavaOrderId = new URLSearchParams(window.location.search).get("lava_return");
    if (lavaOrderId) {
      fetch("/api/checkout/lava/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: lavaOrderId }),
      }).catch(() => {});
    }
    const t = setInterval(async () => {
      const me = await fetch("/api/auth/me").then((r) => r.ok ? r.json() : null);
      if (me?.subscription?.status === "active") {
        clearInterval(t);
        if (!alive) return;
        const pk = me.subscription.planKey;
        const plan = getPlan(pk);
        const goAccount = plan && plan.price > 0 && pk !== "vault";
        router.replace(goAccount ? "/subscription" : "/dashboard");
      }
    }, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [paid, router]);
  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">Loading…</div>
    );
  }

  return (
    <>
      <SiteNav />
      <Container className="max-w-lg py-16">
        <div className="mb-8 text-center">
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            {renewMode ? "Renew your access" : upgradeFrom ? "Upgrade your plan" : selPlan === "free" ? "Looksmaxing plans" : (getPlan(selPlan)?.name || "Looksmaxing plans")}
          </h1>
        </div>
        <GlassCard>
          {paid ? (
            <div className="space-y-3 text-center">
              <div className="text-xl font-bold text-green-glow">Payment received — opening the vault…</div>
              <p className="text-sm text-white/55">Your payment was confirmed. This page redirects automatically once your access is ready.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-green-soft" />
                Activating…
              </div>
              <Link href="/dashboard" className="block pt-2">
                <PrimaryButton tone="green" className="w-full">Open Vault</PrimaryButton>
              </Link>
            </div>
          ) : renewMode ? (
            <div className="space-y-4">
              <div className="text-center"><Badge tone="green">Renewal — member price</Badge></div>
              <div className="rounded-2xl border border-green/30 bg-green/[0.07] p-4 text-center">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-black text-green-glow">${RENEW_PRICE}</span>
                  <span className="text-base font-medium text-white/35 line-through">${getPlan("vault")?.price ?? 9}</span>
                </div>
                <p className="mt-2 text-sm text-white/60">Extend your full vault access by 30 days — at the discounted renewal price. Every day you still have left is kept: the new 30 days are added on top of your current expiry.</p>
              </div>
              <PrimaryButton tone="green" className="w-full" onClick={payWithCard} disabled={busy}>
                {busy ? "Redirecting…" : `Renew for $${RENEW_PRICE} — pay by card`}
              </PrimaryButton>
              <Link href="/dashboard" className="block"><GhostButton className="w-full">Back to the vault</GhostButton></Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                {PLANS.filter((p) => {
                  if (upgradeFrom) { const cur = getPlan(upgradeFrom); return cur ? p.price > cur.price : true; }
                  return true;
                }).map((p) => (
                  <div key={p.key} onClick={() => setSelPlan(p.key)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${selPlan === p.key ? "border-green/50 bg-green/[0.07]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white/80">{p.name}</div>
                        <p className="mt-1 text-xs leading-relaxed text-white/50">{p.description}</p>
                      </div>
                      <PriceBlock p={p} big />
                    </div>
                    <ul className="mt-3 space-y-1">
                      {p.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-white/55"><span className="text-green-glow">✓</span><span>{f}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <PrimaryButton tone="green" className="w-full" onClick={selPlan === "free" ? activateFree : payWithCard} disabled={busy}>
                  {busy ? "Redirecting…" : (selPlan === "free" ? FREE_PLAN.cta : `Pay $${getPlan(selPlan)?.price ?? ""} — Pay by card`)}
                </PrimaryButton>
                <p className="text-center text-xs text-white/40">Visa / Mastercard · instant access · processed by Lava.</p>
              </div>
            </div>
          )}
          {error && (<p className="mt-4 rounded-xl bg-red/15 px-3 py-2 text-sm text-red-glow">{error}</p>)}
        </GlassCard>
        <p className="mt-4 text-center text-xs text-white/35">Visa / Mastercard · processed by Lava.top · no crypto needed</p>
      </Container>
    </>
  );
}
