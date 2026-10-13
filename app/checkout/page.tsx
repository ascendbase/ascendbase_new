"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, GhostButton, Badge, Input } from "@/components/ui";
import { PLANS, FREE_PLAN, getPlan, activePlans, type Plan } from "@/lib/plans";

type Network = { coin: string; net: string; address: string; memoSupported: boolean };
type Invoice = {
  orderId: string;
  amount: number;
  coin: string;
  net: string;
  address: string;
  reference: string;
  networks: Network[];
  uri?: string;
  sandbox: boolean;
  status: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  // Price display: promo sale price (big) + crossed-out original, or
  // just the price when there's no promo. Matches the charged amount.
  function PriceBlock({ p, big = false }: { p: Plan; big?: boolean }) {
    const sale = p.salePrice;
    const green = big ? "text-2xl" : "text-xl";
    if (sale != null && sale !== p.price) {
      return (
        <span className="flex items-baseline gap-2">
          <span className={`font-black ${green} text-green-glow`}>{sale} USDT</span>
          <span className="text-sm text-white/40 line-through">{p.price} USDT</span>
        </span>
      );
    }
    return <span className={`font-black ${green} text-green-glow`}>{p.price} USDT</span>;
  }
  const [state, setState] = useState<"loading" | "ready" | "pending">("loading");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selPlan, setSelPlan] = useState<string>("free");
  const [selNet, setSelNet] = useState<Network | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [pendingRef, setPendingRef] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");
  // Optional fallback: users paying on non-USDT networks (or whose browser
  // closed during payment) can still submit their tx hash for manual
  // verification. Hidden by default — USDT TRC20 verifies automatically.
  const [showHash, setShowHash] = useState(false);
  // Upgrade mode: ?upgrade=<currentPlanKey> preselects the next tier
  // and only lets the user pay the difference (no downgrades).
  const [upgradeFrom, setUpgradeFrom] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user) {
        router.replace("/login");
        return;
      }
      // An UPGRADE user is already active — but they're arriving via
      // /checkout?upgrade=... to pay the difference, so DON'T bounce
      // them to the vault. Only redirect active users who aren't upgrading.
      const upParam = new URLSearchParams(window.location.search).get("upgrade");
      if (me.subscription && me.subscription.status === "active" && !upParam) {
        router.replace("/dashboard");
        return;
      }
      // Awaiting your verification — show the waiting screen, not the
      // plan picker, so a refresh doesn't look like nothing happened.
      if (me.subscription && me.subscription.status === "pending") {
        setPendingRef(me.subscription.orderId || "");
        setState("pending");
        return;
      }
      // Upgrade flow: preselect the lowest tier above the current one.
      const up = new URLSearchParams(window.location.search).get("upgrade");
      if (up) {
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

  async function generate() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planKey: selPlan,
        upgradeFrom: upgradeFrom || undefined,
      }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(data.error || "Could not create invoice.");
      return;
    }
    setInvoice(data);
    setSelNet(
      data.networks && data.networks.length
        ? data.networks[0]
        : { coin: data.coin, net: data.net, address: data.address, memoSupported: false }
    );
  }

  async function activateFree() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/checkout/free", { method: "POST" });
    setBusy(false);
    if (r.ok) router.replace("/dashboard");
    else {
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Could not activate free access.");
    }
  }

  function currentNet(): Network {
    if (selNet) return selNet;
    return invoice
      ? { coin: invoice.coin, net: invoice.net, address: invoice.address, memoSupported: false }
      : { coin: "", net: "", address: "", memoSupported: false };
  }

  async function simulate() {
    if (!invoice) return;
    setBusy(true);
    const me = await fetch("/api/auth/me").then((r) =>
      r.ok ? r.json() : null
    );
    const r = await fetch("/api/checkout/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: invoice.orderId,
        amount: invoice.amount,
        planKey: selPlan,
        coin: invoice.coin,
        net: invoice.net,
        userId: me?.user?.id,
      }),
    });
    setBusy(false);
    if (r.ok) router.replace("/dashboard");
    else setError("Simulation failed.");
  }

  // Poll for the owner's verification. Runs in both waiting cases:
  // (a) right after "I've sent the payment" (paid === true, state
  // still "ready"), and (b) if the user refreshes the page while
  // still pending (state === "pending"). Once the subscription flips
  // to "active", open the vault automatically. `paid` MUST be in the
  // dep array — otherwise flipping it to true never re-runs the effect.
  useEffect(() => {
    if (state !== "pending" && !paid) return;
    let alive = true;
    const t = setInterval(async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (me?.subscription?.status === "active") {
        clearInterval(t);
        if (!alive) return;
        // Paid tiers (price > 0) land on the Account page so the
        // member can manage their subscription. The free tier and the
        // 19 USDT "Full Vault Access" tier go straight to the vault.
        const pk = me.subscription.planKey;
        const plan = getPlan(pk);
        const goAccount = plan && plan.price > 0 && pk !== "vault";
        router.replace(goAccount ? "/subscription" : "/dashboard");
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [state, paid, router]);

  // AUTO-POLL: while a live (non-sandbox) invoice is on screen, ask the
  // server to check the public blockchain for the member's exact tagged
  // payment. When it lands, the pending subscription is created and confirmed
  // server-side and `paid` flips to true — the existing poll above then
  // redirects to the vault automatically. Zero manual admin verification.
  useEffect(() => {
    if (state !== "ready" || !invoice || invoice.sandbox || paid) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch("/api/checkout/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: invoice.orderId }),
        });
        const d = await r.json().catch(() => null);
        if (d?.found && alive) {
          setPaid(true);
          return; // stop scheduling; the subscription poll takes over
        }
      } catch {
        /* network hiccup — try again on the next tick */
      }
      if (alive) timer = setTimeout(tick, 15000);
    };
    timer = setTimeout(tick, 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [state, invoice, paid]);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  const net = currentNet();

  return (
    <>
      <SiteNav />
      <Container className="max-w-lg py-16">
          <div className="mb-8 text-center">
          <h1 className="mt-4 text-3xl font-black tracking-tight">
            {upgradeFrom
              ? "Upgrade your plan"
              : selPlan === "free"
              ? "Looksmaxing plans"
              : (getPlan(selPlan)?.name || "Looksmaxing plans")}
          </h1>
        </div>

        <GlassCard>
          {state === "pending" ? (
            <div className="space-y-3 text-center">
              <div className="text-xl font-bold text-green-glow">
                Payment awaiting verification ⏳
              </div>
              <p className="text-sm text-white/55">
                Payment detected on-chain. Access opens as soon as the transfer
                is confirmed (usually under a minute). This page refreshes
                automatically once it’s confirmed.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-green-soft" />
                Waiting for verification…
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard" className="flex-1">
                  <PrimaryButton tone="green" className="w-full">Open Vault</PrimaryButton>
                </Link>
                <Link href="/support" className="flex-1">
                  <GhostButton className="w-full">Message support</GhostButton>
                </Link>
              </div>
            </div>
          ) : !invoice ? (
              <div className="space-y-5">
                <div className="text-center">
                  <Badge tone="green">Choose your plan</Badge>
                </div>
                <div className="rounded-2xl border border-green/25 bg-green/10 px-4 py-3 text-center text-sm text-white/75">
                  Questions about a paid plan, or anything about how the payment
                  works? <Link href="/support" className="font-semibold text-green-glow underline underline-offset-2 hover:text-green-soft">Message me in Support</Link> - I answer
                  everyone personally and quickly, so you always know exactly what
                  you’re getting before you actually pay for anything.
                </div>
              <div className="space-y-3">
                {!upgradeFrom && (
                  <button
                    key={FREE_PLAN.key}
                    onClick={() => setSelPlan(FREE_PLAN.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selPlan === FREE_PLAN.key
                        ? "border-green/60 bg-green/10"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{FREE_PLAN.name}</span>
                      <span className="text-xl font-black text-green-glow">Free</span>
                    </div>
                  <p className="mt-1 text-sm text-white/50">
                    Some vault content is open to everyone. Start here, upgrade
                    anytime with crypto.
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="flex gap-2 text-xs text-white/60">
                      <span className="text-green-glow">✓</span>
                      <span>Free automatic ratios calculator</span>
                    </li>
                  </ul>
                </button>
                )}
                {activePlans()
                  .filter((p) =>
                    upgradeFrom
                      ? p.price > (getPlan(upgradeFrom)?.price ?? 0)
                      : true
                  )
                  .map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setSelPlan(p.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selPlan === p.key
                        ? "border-green/60 bg-green/10"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{p.name}</span>
                      {upgradeFrom ? (
                        <span className="text-xl font-black text-green-glow">
                          +{Math.max(
                            0,
                            Math.round(
                              ((p.salePrice ?? p.price) -
                                (getPlan(upgradeFrom)?.salePrice ??
                                  getPlan(upgradeFrom)?.price ??
                                  0)) *
                                100
                            ) / 100
                          )} USDT
                        </span>
                      ) : (
                        <PriceBlock p={p} />
                      )}
                    </div>
                    {!upgradeFrom && p.salePrice != null && p.salePrice !== p.price && (
                      <span className="mt-1 inline-block rounded-full bg-red/15 px-2 py-0.5 text-[11px] font-semibold text-red-glow">
                        Limited offer
                      </span>
                    )}
                    <p className="mt-1 text-sm text-white/50">{p.description}</p>
                    <ul className="mt-2 space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex gap-2 text-xs text-white/60">
                          <span className="text-green-glow">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <PrimaryButton
                tone="green"
                className="w-full"
                onClick={selPlan === "free" ? activateFree : generate}
                disabled={busy}
              >
                {busy
                  ? "Generating…"
                  : (selPlan === "free"
                      ? FREE_PLAN.cta
                      : (getPlan(selPlan)?.cta || "Continue to payment"))}
              </PrimaryButton>
            </div>
          ) : paid ? (
              <div className="space-y-3 text-center">
                <div className="text-xl font-bold text-green-glow">
                  Payment marked as sent ✓
                </div>
              <p className="text-sm text-white/55">
                We’re now watching the blockchain for your transfer. As soon as
                the exact amount arrives in the wallet, your access is granted
                automatically — no waiting for a manual check.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                <span className="spin inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-green-soft" />
                Waiting for verification…
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard" className="flex-1">
                  <PrimaryButton tone="green" className="w-full">Open Vault</PrimaryButton>
                </Link>
                <Link href="/support" className="flex-1">
                  <GhostButton className="w-full">Message support</GhostButton>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Amount due</span>
                <span className="text-xl font-black">
                  {invoice.amount} {invoice.coin}
                </span>
              </div>

              {invoice.networks && invoice.networks.length > 1 && (
                <div>
                  <span className="text-sm text-white/60">Pay with</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {invoice.networks.map((n) => (
                      <button
                        key={n.coin + n.net}
                        onClick={() => setSelNet(n)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          selNet?.coin === n.coin && selNet?.net === n.net
                            ? "btn-green"
                            : "btn-ghost"
                        }`}
                      >
                        {n.coin} · {n.net}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm text-white/60">Send to this address</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="break-all rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-sm">
                    {net.address}
                  </div>
                  <button
                    onClick={() => copy(net.address)}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {invoice.sandbox ? (
                <>
                  <p className="rounded-xl bg-white/5 p-3 text-xs text-white/50">
                    SANDBOX MODE — no real payment is taken. Click below to
                    simulate a confirmed transfer and open the vault.
                  </p>
                  <PrimaryButton
                    tone="green"
                    className="w-full"
                    onClick={simulate}
                    disabled={busy}
                  >
                    {busy ? "Confirming…" : "Simulate payment (sandbox)"}
                  </PrimaryButton>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-green/30 bg-green/[0.06] p-4 text-sm text-white/70">
                    <div className="mb-2 font-semibold text-white">
                      How to complete your payment
                    </div>
                    <ol className="list-decimal space-y-2 pl-5">
                      <li>
                        Send exactly{" "}
                        <b className="text-white">
                          {invoice.amount} {invoice.coin}
                        </b>{" "}
                        to the wallet address shown above.{" "}
                        <b className="text-white">
                          The exact amount (including the last cents) is your
                          personal payment code
                        </b>{" "}
                        — it tells the system which order the transfer belongs
                        to, so pay it precisely as shown.
                      </li>
                      <li>
                        <b className="text-white">Keep this page open.</b> Your
                        access is verified automatically on the blockchain —
                        typically within a minute of the transfer confirming.
                        Nothing else to click, no hash to paste.
                      </li>
                      <li>
                        The page will switch to the vault by itself once the
                        payment is detected. You can safely leave it in the
                        background; verification still runs server-side.
                      </li>
                    </ol>
                    <p className="mt-3 flex items-center gap-2 text-xs text-white/55">
                      <span className="spin inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white/20 border-t-green-soft" />
                      Watching the blockchain for your transfer…
                    </p>
                    <p className="mt-3 rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red-glow">
                      ⚠ Send your {invoice.coin} <b className="text-white">only on the {invoice.net} network</b>.
                      Sending on a different chain (e.g. ERC20 instead of
                      TRC20) will not reach this address and can't be verified —
                      your funds may be lost.
                    </p>
                  </div>

                  {/* Manual fallback — only for non-USDT payments or recovery
                      cases where automatic verification can't run. */}
                  {showHash ? (
                    <div className="space-y-2">
                      <span className="text-sm text-white/60">
                        Fallback: paste your transaction hash (TX id)
                      </span>
                      <Input
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="0x… / Tron tx id"
                        className="field-green"
                      />
                      {txError && (
                        <p className="text-sm text-red-glow">{txError}</p>
                      )}
                      <PrimaryButton
                        tone="green"
                        className="w-full"
                        disabled={busy}
                        onClick={async () => {
                          if (!txHash.trim()) {
                            setTxError("Enter the transaction hash to continue.");
                            return;
                          }
                          setBusy(true);
                          setTxError("");
                          const r = await fetch("/api/checkout/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              orderId: invoice.orderId,
                              txHash: txHash.trim(),
                              amount: invoice.amount,
                              planKey: selPlan,
                              coin: invoice.coin,
                              net: invoice.net,
                            }),
                          });
                          setBusy(false);
                          if (r.ok) setPaid(true);
                          else {
                            const d = await r.json().catch(() => ({}));
                            setTxError(d.error || "Could not submit hash.");
                          }
                        }}
                      >
                        {busy ? "Submitting…" : "I’ve sent the payment"}
                      </PrimaryButton>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHash(true)}
                      className="w-full text-center text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
                    >
                      Paid already or stuck? Submit your transaction hash manually
                    </button>
                  )}
                </>
              )}

              <GhostButton
                className="w-full"
                onClick={() => {
                  setInvoice(null);
                  setSelNet(null);
                  setPaid(false);
                }}
              >
                Back
              </GhostButton>
            </div>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-green/15 px-3 py-2 text-sm text-green-glow">
              {error}
            </p>
          )}
        </GlassCard>

        <p className="mt-4 text-center text-xs text-white/35">
          Self-custody crypto · pay from any wallet · no account, no KYC
        </p>
      </Container>
    </>
  );
}
