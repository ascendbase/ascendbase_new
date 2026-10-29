"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard, PrimaryButton, GhostButton, Input, TextArea, Label, Badge } from "@/components/ui";

type LogRow = { email: string; kind: string; subject: string; status: string; error: string | null; opened: number; created_at: string };
type Stats = {
  counts: { all: number; free: number; paid: number; expired: number };
  optouts: number;
  configured: boolean;
  opens: { opened: number; sent: number };
  log: LogRow[];
};

const SEGMENTS: { key: "all" | "free" | "paid" | "expired"; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "free", label: "Free only" },
  { key: "paid", label: "Paid (all)" },
  { key: "expired", label: "Expired paid" },
];

export default function EmailTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [segment, setSegment] = useState<"all" | "free" | "paid" | "expired">("free");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/email").then((x) => (x.ok ? x.json() : null));
    if (r) setStats(r);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sendTest() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment: "test", subject, text, title, ctaLabel, ctaUrl, testEmail }),
    });
    const d = await r.json();
    setBusy(false);
    setMsg(r.ok && d.sent ? "Test email sent — check the inbox." : d.error || "Test send failed.");
    void load();
  }

  async function sendBroadcast() {
    const label = SEGMENTS.find((s) => s.key === segment)?.label || segment;
    if (!confirm(`Send to ${label} (${stats?.counts[segment] ?? "?"} recipients)? This cannot be undone.`)) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, subject, text, title, ctaLabel, ctaUrl, limit: limit ? Number(limit) : undefined }),
    });
    const d = await r.json();
    setBusy(false);
    setMsg(r.ok
      ? `Broadcast sent: ${d.sent} delivered, ${d.failed} failed (of ${d.total}${d.skipped ? `, ${d.skipped} opted out` : ""}).${d.remaining ? ` ${d.remaining} still pending — run again tomorrow to continue the batch.` : ""}`
      : d.error || "Broadcast failed.");
    void load();
  }

  const seg = (k: keyof Stats["counts"]) => stats?.counts[k] ?? 0;

  return (
    <div className="space-y-6">
      <GlassCard className="p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Email</h2>
          <Badge tone={stats?.configured ? "green" : "red"}>
            {stats?.configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
        {!stats?.configured && (
          <p className="mt-2 text-xs text-white/50">
            Set <code className="text-green-glow">RESEND_API_KEY</code> and{" "}
            <code className="text-green-glow">EMAIL_FROM</code> in Vercel env vars, then verify your
            domain at resend.com/domains (see SETUP_EMAIL.md).
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(["all", "free", "paid", "expired"] as const).map((k) => (
            <span key={k} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/70">
              {k}: <b className="text-white">{seg(k)}</b>
            </span>
          ))}
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/70">
            opted out: <b className="text-white">{stats?.optouts ?? 0}</b>
          </span>
          {stats?.opens && stats.opens.sent > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/70">
              broadcast opens: <b className="text-white">{stats.opens.opened}/{stats.opens.sent}</b>{" "}
              <span className="text-white/40">({Math.round((stats.opens.opened / stats.opens.sent) * 100)}%)</span>
            </span>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-white/60">New broadcast</h3>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button key={s.key} onClick={() => setSegment(s.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${segment === s.key ? "btn-red" : "btn-ghost"}`}>
                {s.label} ({seg(s.key)})
              </button>
            ))}
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's new in the vault" /></div>
          <div><Label>Headline (shown big in the email)</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Card payments just went live" /></div>
          <div><Label>Body</Label><TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Short, personal, one idea. End with the reason to click."} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA label (optional)</Label><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Get my morphs for $19" /></div>
            <div><Label>CTA URL</Label><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://www.ascendbase.pro/checkout?plan=morphs" /></div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-56 flex-1">
              <Label>Send test to</Label>
              <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="w-40">
              <Label>Batch size</Label>
              <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="80" inputMode="numeric" />
            </div>
            <GhostButton onClick={sendTest} disabled={busy || !subject || !text}>Send test</GhostButton>
            <PrimaryButton tone="green" onClick={sendBroadcast} disabled={busy || !subject || !text}>
              {busy ? "Sending…" : "Send broadcast"}
            </PrimaryButton>
          </div>
          {msg && <p className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-white/80">{msg}</p>}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-white/60">Recent sends</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-white/40">
              <tr><th className="py-1.5 pr-3">When</th><th className="py-1.5 pr-3">To</th><th className="py-1.5 pr-3">Kind</th><th className="py-1.5 pr-3">Subject</th><th className="py-1.5 pr-3">Status</th><th className="py-1.5 pr-3">Opened</th><th className="py-1.5">Error</th></tr>
            </thead>
            <tbody>
              {(stats?.log ?? []).map((l, i) => (
                <tr key={i} className="border-t border-white/[0.06] text-white/70">
                  <td className="py-1.5 pr-3 whitespace-nowrap">{l.created_at?.slice(0, 16).replace("T", " ")}</td>
                  <td className="py-1.5 pr-3">{l.email}</td>
                  <td className="py-1.5 pr-3">{l.kind}</td>
                  <td className="py-1.5 pr-3 max-w-48 truncate">{l.subject}</td>
                  <td className="py-1.5 pr-3">{l.status}</td>
                  <td className="py-1.5 pr-3">{l.opened ? <span className="text-green-glow">✓</span> : <span className="text-white/20">—</span>}</td>
                  <td className="py-1.5 max-w-40 truncate">{l.error ?? ""}</td>
                </tr>
              ))}
              {!stats?.log?.length && (
                <tr><td colSpan={7} className="py-3 text-white/40">No emails sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
