"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, Input, Label, Badge } from "@/components/ui";
import { getPlan } from "@/lib/plans";

type Thread = { id: number; subject: string | null; status: string; updated_at: string };
type Msg = { id: number; sender: string; body: string; image_url: string | null; created_at: string };

export default function SupportPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upying, setUpying] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);

  async function uploadImage(file: File) {
    setUpying(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/support/upload", { method: "POST", body: fd });
    const d = await r.json();
    setUpying(false);
    if (r.ok) setPendingImg(d.url);
    else alert(d.error || "Upload failed");
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user) {
        router.replace("/login");
        return;
      }
      if (me.user.role === "admin") {
        router.replace("/admin");
        return;
      }
      const sub = me.subscription;
      if (sub && sub.status === "active" && sub.planKey && sub.planKey !== "free") {
        const p = getPlan(sub.planKey);
        if (p) setPlanName(p.name);
      }
      const t = await fetch("/api/support").then((r) =>
        r.ok ? r.json() : null
      );
      if (t) setThreads(t.threads || []);
      setReady(true);
    })();
  }, [router]);

  async function openThread(id: number) {
    setActive(id);
    setNewOpen(false);
    const m = await fetch(`/api/support/${id}`).then((r) =>
      r.ok ? r.json() : null
    );
    if (m) setMessages(m.messages || []);
  }

  async function refreshThreads() {
    const t = await fetch("/api/support").then((r) => (r.ok ? r.json() : null));
    if (t) setThreads(t.threads || []);
  }

  async function send() {
    if (!draft.trim() && !pendingImg) return;
    setBusy(true);
    const r = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        active
          ? { threadId: active, body: draft, imageUrl: pendingImg }
          : { subject, body: draft, imageUrl: pendingImg }
      ),
    });
    setBusy(false);
    if (r.ok) {
      const d = await r.json();
      setDraft("");
      setPendingImg(null);
      await refreshThreads();
      const tid = active || d.threadId;
      if (tid) openThread(tid);
      setNewOpen(false);
    }
  }

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );

  return (
    <>
      <SiteNav />
      <Container className="py-12">
        <h1 className="text-3xl font-black tracking-tight">
          {planName ? "Your Personal Line" : "Support"}
        </h1>
        <p className="mt-1 text-white/55">
          {planName
            ? `This is your ${planName} channel — message me directly and I'll get back to you.`
            : "Message me directly — I read every thread."}
        </p>
        {planName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green/15 px-4 py-1.5 text-sm font-semibold text-green-glow">
            <span>✨</span> {planName} active
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            <PrimaryButton
              className="w-full"
              onClick={() => {
                setNewOpen((v) => !v);
                setActive(null);
                setMessages([]);
              }}
            >
              {newOpen ? "Cancel" : "New message"}
            </PrimaryButton>
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`w-full rounded-2xl p-3 text-left glass ${
                  active === t.id ? "ring-1 ring-red/50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">
                    {t.subject || "Support request"}
                  </span>
                  <Badge tone={t.status === "open" ? "red" : "green"}>
                    {t.status}
                  </Badge>
                </div>
              </button>
            ))}
            {threads.length === 0 && !newOpen && (
              <p className="px-1 text-sm text-white/40">No conversations yet.</p>
            )}
          </div>

          <GlassCard className="flex min-h-[420px] flex-col">
            {newOpen && !active && (
              <div className="mb-3">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's it about?"
                />
              </div>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-sm text-white/40">Start the conversation…</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender === "user" ? "btn-red" : "bg-white/10"
                    }`}
                  >
                    {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                    {m.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image_url}
                        alt=""
                        className="mt-2 max-h-60 rounded-xl object-cover"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {pendingImg && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImg}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <button
                  onClick={() => setPendingImg(null)}
                  className="text-xs text-white/50 hover:text-red-glow"
                >
                  Remove
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <label className="flex shrink-0 cursor-pointer items-center rounded-full border border-white/15 px-3 py-2 text-sm hover:bg-white/5">
                {upying ? "…" : "📎"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
              </label>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <PrimaryButton
                onClick={send}
                disabled={busy || (!draft.trim() && !pendingImg)}
              >
                {busy ? "…" : "Send"}
              </PrimaryButton>
            </div>
          </GlassCard>
        </div>
      </Container>
    </>
  );
}
