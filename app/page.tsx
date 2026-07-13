import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, GhostButton, Badge } from "@/components/ui";
import Link from "next/link";

const benefits = [
  {
    t: "Highest ROI info",
    d: "Get access to the most relevant knowledge related to male facial attractiveness.",
    icon: "✦",
  },
  {
    t: "Personal support",
    d: "Stuck on something or got any question - Message me directly from inside the app. Real replies, not a bot.",
    icon: "🤝",
  },
  {
    t: "Built for in depth thinkers",
    d: "Complex, system-level explanation of facial attractiveness",
    icon: "🧠",
  },
  {
    t: "Always evolving",
    d: "New modules and deep-dives land regularly. Your access covers everything published.",
    icon: "↻",
  },
    {
    t: "The premium vault",
    d: "Practical steps, personal facial evaluation, theory deep dives, exploration of craniofacial development patterns.",
    icon: "▦",
  },
  {
    t: "Yours to keep",
    d: "For the duration of your access you can read, revisit, and save whatever you need.",
    icon: "✓",
  },
];

const steps = [
  { n: "01", t: "Sign up", d: "Create your account with an email and password. Takes five seconds." },
  { n: "02", t: "Unlock the free vault", d: "Get the grasp on what actually matters here, not some random tiktok level info" },
  { n: "03", t: "Continue the exploration", d: "Get access to practical side of the game, explore the actual mechanisms of craniofacial development patterns" },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <Container className="relative py-20 sm:py-28 text-center">
            <div className="fade-up">
              <Badge tone="green">Unlock the looksmaxing matrix</Badge>
              <h1 className="mt-6 text-5xl sm:text-7xl font-black tracking-tight leading-[1.04]">
                ascend<span className="text-red-glow">base</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-white/60 sm:text-xl">
                Sign up and get access to the actually gated knowledge in this game
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/checkout">
                  <PrimaryButton className="px-8 py-3.5 text-base">
                    Open vault →
                  </PrimaryButton>
                </Link>
                <a href="#benefits">
                  <GhostButton className="px-8 py-3.5 text-base">
                    See what&apos;s inside
                  </GhostButton>
                </a>
              </div>
              <p className="mt-4 text-sm text-white/40">
                Start literally patching looksmaxing for free bro
              </p>
            </div>

            {/* floating glass preview */}
            <div className="fade-up mx-auto mt-14 max-w-md">
              <GlassCard className="text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/70">
                    Your access
                  </span>
                  <Badge tone="green">Active</Badge>
                </div>
                <div className="mt-4 text-3xl font-black">The Vault</div>
                <p className="mt-1 text-sm text-white/50">
                  All modules unlocked. Personal support included.
                </p>
                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full btn-red"
                    style={{ width: "72%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/40">
                  21 days remaining in this access period
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
              <p className="mx-auto mt-3 max-w-xl text-white/55">
                A focused, premium resource — and a direct line to me whenever
                you need a hand.
              </p>
            </div>
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
          </Container>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 sm:py-24">
          <Container>
            <div className="text-center">
              <Badge tone="white">How it works</Badge>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                Three steps to the looksmaxing vault
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {steps.map((s) => (
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

        {/* SUPPORT */}
        <section id="support" className="scroll-mt-20 py-16 sm:py-24">
          <Container>
            <GlassCard className="relative overflow-hidden text-center">
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 h-48"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(0, 255, 38, 0.24), transparent 70%)",
                }}
              />
              <div className="relative">
                <Badge tone="green">Personal support</Badge>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                  Personal looksmaxing advice
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-white/55">
                  Get in contact with me directly, send your face and recieve:
                  - Full list of your individual facial flaws
                  - Full package of your facial ratios and your harmony score
                  - Full explanation of your facial status with Q&A option until you 100% undestand the actual meaning behind every detail
                  - Full access to the gated vault for 30 days content as a bonus
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/checkout">
                    <PrimaryButton className="px-8 py-3.5 text-base">
                      Get premium access
                    </PrimaryButton>
                  </Link>
                  <a href="#benefits">
                    <GhostButton className="px-8 py-3.5 text-base">
                      Back to benefits
                    </GhostButton>
                  </a>
                </div>
              </div>
            </GlassCard>
          </Container>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 py-10">
          <Container className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-sm text-white/40">
              © {new Date().getFullYear()} ascendbase
            </span>
            <span className="text-sm text-white/40">
              Crypto access · Built for focus
            </span>
          </Container>
        </footer>
      </main>
    </>
  );
}
