"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, GhostButton, Badge } from "@/components/ui";
import { PLANS, getPlan, FREE_PLAN } from "@/lib/plans";

type Sub = {
  status: string;
  expiresAt: string | null;
  plan: string | null;
  planKey: string | null;
  orderId?: string;
} | null;

export default function SubscriptionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sub, setSub] = useState<Sub>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user) {
        router.replace("/login");
        return;
      }
      setEmail(me.user.email);
      setSub(me.subscription || null);
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  const isPaid =
    sub && sub.status === "active" && sub.planKey && sub.planKey !== "free";
  const isPending = sub && sub.status === "pending";
  const plan = isPaid ? getPlan(sub!.planKey!) : null;

  return (
    <>
      <SiteNav />
      <Container className="py-12">
        <h1 className="text-3xl font-black tracking-tight">Your account</h1>
        <p className="mt-1 text-sm text-white/50">{email}</p>

        <GlassCard className="mt-6">
          {isPaid ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{plan!.name}</span>
                <Badge tone="green">active</Badge>
              </div>
              <p className="text-sm text-white/55">{plan!.description}</p>
              <ul className="space-y-1.5">
                {plan!.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/70">
                    <span className="text-green-glow">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {sub!.expiresAt && (
                <p className="text-sm text-white/50">
                  Access until{" "}
                  <span className="text-white/80">
                    {new Date(sub!.expiresAt!).toLocaleDateString()}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href="/dashboard">
                  <PrimaryButton>Open the vault</PrimaryButton>
                </Link>
                <Link href="/support">
                  <PrimaryButton tone="green">Your Personal line</PrimaryButton>
                </Link>
              </div>
            </div>
          ) : isPending ? (
            <div className="space-y-3 text-center">
              <div className="text-xl font-bold text-green-glow">
                Payment awaiting verification ⏳
              </div>
              <p className="text-sm text-white/55">
                We’ve received your payment notice. Access opens as soon as the
                owner verifies the transfer in their wallet (usually within a few
                hours). You’ll be able to open the vault automatically once it’s
                confirmed.
              </p>
              {sub!.orderId && (
                <div className="rounded-xl bg-white/5 p-3 text-left">
                  <div className="text-xs text-white/45">Your reference</div>
                  <div className="mt-1 break-all font-mono text-sm text-white/80">
                    {sub!.orderId}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-green-soft" />
                Waiting for verification…
              </div>
              <Link href="/support">
                <GhostButton className="w-full">Message support</GhostButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{FREE_PLAN.name}</span>
                <Badge tone="white">free</Badge>
              </div>
              <p className="text-sm text-white/55">
                You’re on the free tier — some vault content is open to everyone.
                Upgrade anytime with crypto to unlock everything.
              </p>
              <Link href="/checkout">
                <PrimaryButton className="w-full">
                  Upgrade with crypto →
                </PrimaryButton>
              </Link>
            </div>
          )}
        </GlassCard>

        {isPaid && PLANS.some((p) => p.price > (plan?.price ?? 0)) && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
              Upgrade your plan
            </h2>
            <p className="mb-3 text-xs text-white/45">
              You can only move to a higher tier. You’ll pay just the
              remaining difference for the rest of your current period.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLANS.filter((p) => p.price > (plan?.price ?? 0)).map((p) => {
                const diff = Math.max(
                  0,
                  Math.round((p.price - (plan?.price ?? 0)) * 100) / 100
                );
                return (
                  <GlassCard key={p.key} className="p-4">
                    <div className="font-bold">{p.name}</div>
                    <div className="mt-1 text-xl font-black text-green-glow">
                      +{diff} USDT
                    </div>
                    <p className="mt-2 text-xs text-white/50">{p.description}</p>
                    <Link
                      href={`/checkout?upgrade=${sub!.planKey}`}
                      className="mt-3 block"
                    >
                      <GhostButton className="w-full text-sm">
                        Upgrade to {p.name}
                      </GhostButton>
                    </Link>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
