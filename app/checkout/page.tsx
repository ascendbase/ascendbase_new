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
  // to "active", open the vault automatically.
  useEffect(() => {
    if (state !== "pending" && !paid) return;
    let alive = true;
    const t = setInterval(async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (me?.subscription?.status === "active") {
        clearInterval(t);
        if (alive) router.replace("/dashboard");
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [state, router]);

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
              ? "Unlock the vault"
              : (getPlan(selPlan)?.name || "Unlock the vault")}
          </h1>
        </div>

        <GlassCard>
          {state === "pending" ? (
            <div className="space-y-3 text-center">
              <div className="text-xl font-bold text-green-glow">
                Payment awaiting verification ⏳
              </div>
              <p className="text-sm text-white/55">
                We’ve received your payment notice. Access opens as soon as the
                owner verifies the transfer in their wallet (usually within a few
                hours). This page refreshes automatically once it’s confirmed.
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
                      <span className="text-xl font-black text-green-glow">
                        {upgradeFrom
                          ? `+${Math.max(
                              0,
                              Math.round(
                                (p.price - (getPlan(upgradeFrom)?.price ?? 0)) * 100
                              ) / 100
                            )} USDT`
                          : `${p.price} USDT`}
                      </span>
                    </div>
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
                The owner will verify the transfer in their wallet and grant
                access shortly. This page refreshes automatically once it’s
                confirmed — no need to do anything else.
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
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                    <div className="mb-2 font-semibold text-white">
                      How to complete your payment (3 easy steps)
                    </div>
                    <ol className="list-decimal space-y-2 pl-5">
                      <li>
                        Send exactly{" "}
                        <b className="text-white">
                          {invoice.amount} {invoice.coin}
                        </b>{" "}
                        to the wallet address shown above.
                      </li>
                      <li>
                        In <b className="text-white">your own wallet app</b>, open
                        this transfer and copy its{" "}
                        <b className="text-white">Transaction hash (TX id)</b> —
                        it looks like a long string of letters & numbers
                        (e.g. <span className="font-mono text-white/60">0x…</span> or{" "}
                        <span className="font-mono text-white/60">a1b2c3…</span>).
                        This is your proof of payment.
                      </li>
                      <li>
                        Paste that hash in the box below and click{" "}
                        <b className="text-white">“I’ve sent the payment”</b>.
                        We’ll unlock your access as soon as the owner
                        verifies the transfer (usually within a few hours).
                      </li>
                    </ol>
                    <p className="mt-3 text-xs text-white/45">
                      Confused where the TX hash is? After sending, most wallets
                      show it under "Transaction details" / "View on explorer".
                      If you can't find it, just message us from the Support
                      page and we'll help.
                    </p>
                    <p className="mt-3 rounded-xl border border-red/30 bg-red/10 p-3 text-xs text-red-glow">
                      ⚠ Send your {invoice.coin} <b className="text-white">only on the {invoice.net} network</b>.
                      Sending on a different chain (e.g. ERC20 instead of
                      TRC20) will not reach this address and can't be verified —
                      your funds may be lost.
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-white/60">
                      Transaction hash (TX id) — paste it here
                    </span>
                    <Input
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x… / Tron tx id"
                      className="mt-1 field-green"
                    />
                  </div>
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
