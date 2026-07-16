"use client";

import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, GhostButton, Badge } from "@/components/ui";
import Link from "next/link";
import { PLANS, FREE_PLAN } from "@/lib/plans";

const benefits = [
  {
    t: "System-level, not TikTok",
    d: "Real craniofacial mechanics — how the face actually develops and what drives attractiveness.",
    icon: "✦",
  },
  {
    t: "Start free",
    d: "Sign up and read the free vault immediately. No card, no crypto, no risk.",
    icon: "⚡",
  },
  {
    t: "Personal support",
    d: "Stuck or curious? Message me directly from inside the app. Real replies, not a bot.",
    icon: "🤝",
  },
  {
    t: "Always evolving",
    d: "New modules and deep-dives land regularly. Your access covers everything published.",
    icon: "↻",
  },
  {
    t: "The premium vault",
    d: "Practical steps, personal facial evaluation, theory deep-dives, craniofacial development patterns.",
    icon: "▦",
  },
  {
    t: "Yours to keep",
    d: "For the duration of your access you can read, revisit, and save whatever you need.",
    icon: "✓",
  },
];

function TierCard({ p, loggedIn }: { p: typeof PLANS[number]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const visible = open ? p.features : p.features.slice(0, 3);
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="text-sm font-semibold text-white/80">{p.name}</div>
      <div className="mt-3 text-3xl font-black">
        {p.price}
        <span className="text-base font-medium text-white/45"> USDT</span>
      </div>
      <p className="mt-1 text-xs text-white/45">{p.days} days access</p>
      <ul className="mt-4 space-y-2 text-sm text-white/60">
        {visible.map((f, i) => (
          <li key={i}>✓ {f}</li>
        ))}
      </ul>
      {p.features.length > 3 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-2 self-start text-xs font-semibold text-red-glow hover:underline"
        >
          {open ? "Show less ▲" : `Show all ${p.features.length} features ▼`}
        </button>
      )}
      <div className="mt-auto pt-5">
        <Link href={loggedIn ? "/dashboard" : "/checkout"}>
          <PrimaryButton className="w-full py-2.5 text-sm">
            {loggedIn ? "Open vault →" : "Unlock →"}
          </PrimaryButton>
        </Link>
      </div>
    </GlassCard>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setLoggedIn(!!(d && d.user));
        setChecked(true);
      })
      .catch(() => {
        setChecked(true);
      });
  }, []);

  return (
    <>
      <SiteNav />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 182, 3, 0.18), transparent 70%)",
              willChange: "transform",
            }}
          />
          <Container className="relative py-20 sm:py-28 text-center">
            <div className="fade-up">
              <Badge tone="green">Male facial attractiveness, decoded</Badge>
              <h1 className="mt-6 text-5xl sm:text-7xl font-black tracking-tight leading-[1.04]">
                ascend<span className="text-red-glow">base</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-white/60 sm:text-xl">
                The system-level knowledge base on male facial attractiveness and
                craniofacial development. Start free — upgrade with crypto only when
                you want the full vault.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                {checked && loggedIn ? (
                  <Link href="/dashboard">
                    <PrimaryButton className="px-8 py-3.5 text-base">
                      Open vault →
                    </PrimaryButton>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <PrimaryButton className="px-8 py-3.5 text-base">
                      Sign up free →
                    </PrimaryButton>
                  </Link>
                )}
                <a href="#vault">
                  <GhostButton className="px-8 py-3.5 text-base">
                    See what's inside
                  </GhostButton>
                </a>
              </div>
              <p className="mt-4 text-sm text-white/40">
                No card required · Free tier is open · Crypto only when you upgrade
              </p>
            </div>

            {/* floating glass preview */}
            <div className="fade-up mx-auto mt-14 max-w-md">
              <GlassCard className="text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/70">
                    Your access
                  </span>
                  <Badge tone="green">Free</Badge>
                </div>
                <div className="mt-4 text-3xl font-black">The Vault</div>
                <p className="mt-1 text-sm text-white/50">
                  Free posts unlocked now. Members-only deep-dives available on upgrade.
                </p>
                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full btn-red"
                    style={{ width: "35%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/40">
                  Free tier · no expiry
                </p>
              </GlassCard>
            </div>
          </Container>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="scroll-mt-20 py-16 sm:py-24">
          <Container>
            <div className="text-center">
              <Badge tone="white">Why ascendbase?</Badge>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Everything you need to ascend
              </h2>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-center text-white/55">
              A focused, premium resource - and a direct line to me whenever
              you need a hand.
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <GlassCard key={b.t} className="transition-transform hover:-translate-y-1">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl btn-red text-xl font-black">
                    {b.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{b.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                    {b.d}
                  </p>
                </GlassCard>
              ))}
            </div>

            {/* curiosity hook */}
            <GlassCard className="mx-auto mt-8 max-w-3xl border-red/25 text-center">
              <p className="text-base leading-relaxed text-white/75 sm:text-lg">
                Do you know what exactly drives attractiveness, besides{" "}
                <span className="text-white/90">muh hunter eyes</span> or some other
                buzzword? Do you know the craniofacial mechanics — the underlying
                logic of how the face actually develops into the variety of different
                facial types (desirable or not) we see IRL?{" "}
                <span className="text-red-glow">
                  This is the place with the answers to these questions.
                </span>
              </p>
            </GlassCard>
          </Container>
        </section>

        {/* VAULT / TIERS */}
        <section id="vault" className="scroll-mt-20 py-16 sm:py-24">
          <Container>
            <div className="text-center">
              <Badge tone="white">The Vault</Badge>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Start free. Go deeper on your terms.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/55">
                Every account opens the free vault instantly. Upgrade with crypto
                whenever you want the members-only deep-dives and personal help.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* FREE TIER — first, clear */}
              <GlassCard className="flex h-full flex-col border-green/30">
                <div className="text-sm font-semibold text-green-glow">
                  {FREE_PLAN.name}
                </div>
                <div className="mt-3 text-3xl font-black">$0</div>
                <p className="mt-1 text-xs text-white/45">forever · no card</p>
                <ul className="mt-4 space-y-2 text-sm text-white/60">
                  <li>✓ Free vault posts</li>
                  <li>✓ Core theory & breakdowns</li>
                  <li>✓ Browse on demand</li>
                </ul>
                <div className="mt-auto pt-5">
                  <Link href="/signup">
                    <PrimaryButton tone="green" className="w-full py-2.5 text-sm">
                      {FREE_PLAN.cta}
                    </PrimaryButton>
                  </Link>
                </div>
              </GlassCard>

              {/* PAID TIERS */}
              {PLANS.map((p) => (
                <TierCard key={p.key} p={p} loggedIn={checked && loggedIn} />
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-white/45">
              Payments are crypto-only (USDT) — no bank, no card, no personal ID
              required. Access is granted after I verify your transfer.
            </p>
          </Container>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-24">
          <Container>
            <div className="text-center">
              <Badge tone="white">How it works</Badge>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Three steps to the vault
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { n: "01", t: "Sign up free", d: "Create your account with an email and password. Takes five seconds — no card." },
                { n: "02", t: "Read the free vault", d: "Get the grasp on what actually matters here, not random TikTok-level info." },
                { n: "03", t: "Go deeper (optional)", d: "Pay crypto to unlock members-only deep-dives and personal facial evaluation." },
              ].map((s) => (
                <GlassCard key={s.n}>
                  <div className="text-red-glow text-2xl font-black">{s.n}</div>
                  <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                    {s.d}
                  </p>
                </GlassCard>
              ))}
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}