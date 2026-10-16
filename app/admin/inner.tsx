"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import {
  Container,
  GlassCard,
  PrimaryButton,
  GhostButton,
  Input,
  TextArea,
  Label,
  Badge,
} from "@/components/ui";
import { PLANS, type Plan } from "@/lib/plans";
import VaultChatTab from "./vault-chat";

type Block =
  | { id: string; type: "text"; text: string; preview?: boolean }
  | { id: string; type: "image"; url: string; caption: string; uploading: boolean; preview?: boolean };

type ContentItem = {
  id: number;
  slug: string | null;
  title: string;
  body: string | null;
  image_data: string | null;
  blocks: any;
  kind?: string;
  parent_id?: number | null;
  order_index?: number;
  access?: string;
  published: number;
  updated_at: string;
};

type PendingPayment = {
  order_id: string;
  plan_key: string | null;
  email: string;
  amount: number | null;
  coin: string | null;
  network: string | null;
  tx_hash: string | null;
  created_at: string;
};

type Thread = {
  id: number;
  user_email: string;
  subject: string | null;
  status: string;
  last_msg: string | null;
};
type Msg = { id: number; sender: string; body: string; image_url: string | null; created_at: string };
type UserRow = {
  id: number;
  email: string;
  role: string;
  created_at?: string;
  sub_status: string | null;
  sub_expires: string | null;
  sub_plan_key: string | null;
  sub_amount: number | null;
  sub_tx_hash: string | null;
  sub_network: string | null;
};

function planLabel(
  key: string | null,
  status: string | null,
  amount?: number | null
): string {
  const byKey = key ? PLANS.find((pl) => pl.key === key) : null;
  const byAmount =
    !byKey && amount != null
      ? PLANS.find((pl) => pl.price === amount)
      : null;
  const plan = byKey || byAmount;
  if (status === "pending") {
    return plan
      ? `Pending: ${plan.price} USDT · ${plan.name}`
      : amount != null
      ? `Pending: ${amount} USDT`
      : "Pending payment";
  }
  if (status === "active") {
    if (!plan) return "Free";
    return `${plan.price} USDT · ${plan.name}`;
  }
  return "No subscription";
}

function uid() {
  return crypto.randomUUID();
}

// Auto-growing textarea: sets its height to the scrollHeight on every
// input so long blocks expand to fit (no inner scrollbar, no cramped box).
// Uses a plain <textarea> (not the shared .field) so we avoid the fixed
// min-height and the heavy blur/transition that made editing feel laggy.
function AutoTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      className="block w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm leading-relaxed text-white/90 outline-none transition focus:border-red/50"
      style={{ minHeight: 90, resize: "none", overflow: "hidden" }}
    />
  );
}

// Parse stored blocks (string or array) into a plain array.
function parseBlocks(raw: any): any[] {
  const str = typeof raw === "string" ? raw : JSON.stringify(raw || []);
  try {
    const arr = JSON.parse(str || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function AdminInner() {
  const router = useRouter();
  const [ready, setReady] = useState(true);
  const [tab, setTab] = useState<
    "content" | "payments" | "support" | "users" | "metrics" | "vault"
  >("content");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user || me.user.role !== "admin") {
        router.replace("/");
        return;
      }
      setReady(true);
    })();
  }, [router]);

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
        <h1 className="text-3xl font-black tracking-tight">Admin</h1>
        <div className="mt-5 flex flex-wrap gap-2">
           {(["content", "payments", "support", "users", "metrics", "vault"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition ${
                tab === t ? "btn-red" : "btn-ghost"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {tab === "content" && <ContentTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "support" && <SupportTab />}
          {tab === "users" && <UsersTab />}
          {tab === "metrics" && <MetricsTab />}
          {tab === "vault" && <VaultChatTab />}
        </div>
      </Container>
    </>
  );
}

/* ---------------- METRICS (weekly profit check) ---------------- */
type MetricsData = {
  totalUsers: number;
  paidEverCount: number;
  activePaidCount: number;
  conversionPct: number;
  revenueTotal: number;
  revenueLast30: number;
  byTier: { planKey: string; count: number; revenue: number }[];
  renewals: number;
  signupDates: string[];
  purchases: { paidAt: string; amount: number; planKey: string }[];
  payments: {
    orderId: string | null;
    email: string;
    planKey: string | null;
    amount: number;
    coin: string | null;
    network: string | null;
    txHash: string | null;
    status: string;
    paidAt: string | null;
    createdAt: string;
    expiresAt: string | null;
    renewal: boolean;
  }[];
  subscribers: {
    userId: number;
    email: string;
    planKey: string | null;
    amount: number;
    orderId: string | null;
    txHash: string | null;
    network: string | null;
    paidAt: string | null;
    expiresAt: string | null;
    daysLeft: number | null;
  }[];
};

function weekStartUtc(dateStr: string): number {
  const d = new Date(dateStr.replace(" ", "T") + "Z").getTime();
  if (isNaN(d)) return 0;
  const day = (new Date(d).getUTCDay() + 6) % 7; // 0 = Monday
  return Math.floor((d - day * 86400000) / 86400000) * 86400000;
}

function MetricsTab() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/metrics");
      if (r.ok) setData(await r.json());
      else setErr("Failed to load metrics.");
    })();
  }, []);

  if (err) return <GlassCard className="p-6 text-sm text-red-glow">{err}</GlassCard>;
  if (!data) return <GlassCard className="p-6 text-sm text-white/50">Loading…</GlassCard>;

  // Bucket the last 8 weeks (oldest → newest).
  const now = Date.now();
  const weeks: { label: string; start: number; signups: number; sales: number; revenue: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = Math.floor((now - i * 7 * 86400000) / (7 * 86400000)) * (7 * 86400000);
    const end = start + 7 * 86400000;
    const label = new Date(start).toISOString().slice(5, 10);
    weeks.push({ label, start, signups: 0, sales: 0, revenue: 0 });
  }
  for (const s of data.signupDates) {
    const w = weekStartUtc(s);
    const bucket = weeks.find((x) => x.start === w);
    if (bucket) bucket.signups++;
  }
  for (const p of data.purchases) {
    const w = weekStartUtc(p.paidAt);
    const bucket = weeks.find((x) => x.start === w);
    if (bucket) {
      bucket.sales++;
      bucket.revenue += p.amount;
    }
  }
  const maxBar = Math.max(1, ...weeks.map((w) => Math.max(w.signups, w.sales)));

  const kpis = [
    { label: "Total signups", value: String(data.totalUsers), sub: "all time" },
    { label: "Paid members", value: String(data.paidEverCount), sub: "ever paid" },
    { label: "Active paid now", value: String(data.activePaidCount), sub: `${data.renewals} renewals` },
    { label: "Signup→paid", value: `${data.conversionPct}%`, sub: "target ≥4%" },
    { label: "Revenue total", value: `${Math.round(data.revenueTotal)} USDT`, sub: "active subs" },
    { label: "Revenue 30d", value: `${Math.round(data.revenueLast30)} USDT`, sub: "last 30 days" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <GlassCard key={k.label} className="p-4">
            <div className="text-xs uppercase tracking-wide text-white/40">{k.label}</div>
            <div className="mt-1 text-2xl font-black text-white">{k.value}</div>
            <div className="text-xs text-white/40">{k.sub}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-bold">Last 8 weeks</span>
          <span className="text-xs text-white/40">signups · sales · revenue</span>
        </div>
        <div className="mt-4 space-y-2">
          {weeks.map((w) => (
            <div key={w.label} className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 text-white/40">{w.label}</span>
              <div className="flex h-4 flex-1 gap-[2px] overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-white/30"
                  style={{ width: `${(w.signups / maxBar) * 60}%` }}
                  title={`Signups: ${w.signups}`}
                />
                <div
                  className="h-full bg-green-glow"
                  style={{ width: `${(w.sales / maxBar) * 40}%` }}
                  title={`Sales: ${w.sales}`}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-white/55">
                {w.signups} signups · {w.sales} sales
              </span>
              <span className="w-16 shrink-0 text-right font-semibold text-green-glow">
                {Math.round(w.revenue)}₮
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/35">
          Visitors aren&apos;t in the DB — check Vercel Analytics for the traffic number.
          Weekly review rule: sales climbing → keep shipping; flat 2 weeks → rework the weakest recent change.
        </p>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="font-bold">Revenue by tier (active subs)</div>
        <div className="mt-3 space-y-2">
          {data.byTier.length === 0 && (
            <p className="text-sm text-white/40">No active paid subscriptions yet.</p>
          )}
          {data.byTier.map((t) => (
            <div key={t.planKey} className="flex items-center justify-between text-sm">
              <span className="text-white/70">{t.planKey}</span>
              <span className="text-white/45">{t.count} active</span>
              <span className="font-semibold text-green-glow">{Math.round(t.revenue)} USDT</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Subscriber roster: everyone currently holding paid access, sorted by
          urgency (soonest expiry first) so renewals-at-risk are on top. */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-bold">Active subscribers ({data.subscribers.length})</span>
          <span className="text-xs text-white/40">sorted by days left</span>
        </div>
        <div className="mt-3 space-y-2">
          {data.subscribers.length === 0 && (
            <p className="text-sm text-white/40">No active paid subscribers yet.</p>
          )}
          {data.subscribers.map((s) => {
            const urgent = s.daysLeft !== null && s.daysLeft <= 7;
            return (
              <div
                key={`${s.userId}-${s.orderId}`}
                className={`rounded-xl border p-3 ${
                  urgent ? "border-red/40 bg-red/[0.05]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{s.email}</span>
                  <Badge tone={urgent ? "red" : "green"}>
                    {s.daysLeft === null
                      ? "no expiry"
                      : s.daysLeft <= 0
                      ? "expiring today"
                      : `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} left`}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                  <span className="font-semibold text-green-glow">
                    {s.planKey} · {s.amount} USDT
                  </span>
                  {s.paidAt && <span>paid {s.paidAt.slice(0, 10)}</span>}
                  {s.expiresAt && <span>until {s.expiresAt.slice(0, 10)}</span>}
                  {s.network && <span>{s.network}</span>}
                  {s.orderId && (
                    <span className="truncate font-mono text-[10px] text-white/30">
                      {s.orderId}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Full payment ledger: every confirmed payment ever, newest first. */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-bold">Payment history ({data.payments.length})</span>
          <span className="text-xs text-white/40">every confirmed payment</span>
        </div>
        <div className="mt-3 space-y-2">
          {data.payments.length === 0 && (
            <p className="text-sm text-white/40">No payments yet.</p>
          )}
          {data.payments.map((p, i) => (
            <div
              key={`${p.orderId}-${i}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{p.email}</span>
                <div className="flex items-center gap-2">
                  {p.renewal && <Badge tone="white">renewal</Badge>}
                  <Badge tone={p.status === "active" ? "green" : "white"}>
                    {p.status}
                  </Badge>
                  <span className="font-bold text-green-glow">
                    {p.amount} {p.coin || "USDT"}
                  </span>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                <span className="font-semibold">{p.planKey}</span>
                {p.paidAt && <span>paid {p.paidAt.slice(0, 10)}</span>}
                {p.expiresAt && <span>until {p.expiresAt.slice(0, 10)}</span>}
                {p.network && <span>{p.network}</span>}
                {p.txHash && (
                  <span
                    className="max-w-[240px] truncate font-mono text-[10px] text-white/30"
                    title={p.txHash}
                  >
                    tx: {p.txHash}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- CONTENT (folder tree + block editor) ---------------- */
function ContentTab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [kind, setKind] = useState<"post" | "folder">("post");
  const [access, setAccess] = useState<"free" | "preview" | "paid">("free");
  const [parentId, setParentId] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // AI generation panel state.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [aiAccess, setAiAccess] = useState<"free" | "preview" | "paid">("free");
  const [aiParent, setAiParent] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");

  // AI-edit-existing-post state.
  const [aiEditOpen, setAiEditOpen] = useState(false);
  const [aiEditInstr, setAiEditInstr] = useState("");
  const [aiEditBusy, setAiEditBusy] = useState(false);
  const [aiEditMsg, setAiEditMsg] = useState("");

  async function generateAi() {
    if (!aiSource.trim()) {
      setAiMsg("Paste the source text to transform.");
      return;
    }
    setAiBusy(true);
    setAiMsg("");
    const r = await fetch("/api/admin/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: aiInstruction,
        sourceText: aiSource,
        access: aiAccess,
        parentId: aiParent ? Number(aiParent) : null,
      }),
    });
    setAiBusy(false);
    if (r.ok) {
      setAiMsg("Draft created — open it below to reorder / add images, then publish.");
      setAiOpen(false);
      setAiInstruction("");
      setAiSource("");
      await load();
    } else {
      const d = await r.json().catch(() => ({}));
      setAiMsg(d.error || "Generation failed.");
    }
  }

  async function aiEditPost() {
    if (!editing || (editing.kind || "post") !== "post") {
      setAiEditMsg("Open a post (not a folder) to AI-edit it.");
      return;
    }
    if (!aiEditInstr.trim()) {
      setAiEditMsg("Describe what to change.");
      return;
    }
    setAiEditBusy(true);
    setAiEditMsg("");
    const r = await fetch(`/api/admin/content/${editing.id}/ai-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: aiEditInstr }),
    });
    setAiEditBusy(false);
    if (r.ok) {
      const d = await r.json();
      if (d.added && d.added > 0) {
        // ADD mode: keep existing blocks, append the new ones after them.
        const existing = blocks;
        const added = (d.blocks || []).slice(existing.length).map(
          (b: any) => ({
            id: uid(),
            type: "text",
            text: typeof b?.text === "string" ? b.text : "",
            preview: false,
          })
        );
        setBlocks((bs) => [...bs, ...added]);
        setAiEditMsg(
          `Added ${added.length} new text block(s) after the existing ones — review below, then click Save to persist.`
        );
      } else {
        // EDIT mode: rewrite existing text blocks in place.
        setBlocks((bs) =>
          bs.map((b, i) => {
            const nb = d.blocks?.[i];
            if (b.type === "text" && nb && nb.type === "text")
              return { ...b, text: nb.text };
            return b;
          })
        );
        setAiEditMsg("Text blocks updated — review below, then click Save to persist.");
      }
      setAiEditOpen(false);
      setAiEditInstr("");
    } else {
      const d = await r.json().catch(() => ({}));
      setAiEditMsg(d.error || "AI edit failed.");
    }
  }

  function parseBlocks(raw: any): any[] {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw || []);
    try {
      const arr = JSON.parse(str || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function resetForm() {
    setEditing(null);
    setKind("post");
    setAccess("free");
    setParentId("");
    setSlug("");
    setTitle("");
    setPublished(true);
    setBlocks([]);
    setMsg("");
  }

  async function load() {
    const c = await fetch("/api/content").then((r) =>
      r.ok ? r.json() : null
    );
    if (c) setItems(c.items || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function edit(it: ContentItem) {
    setEditing(it);
    setKind((it.kind as "post" | "folder") || "post");
    setAccess((it.access as "free" | "preview" | "paid") || "free");
    setParentId(it.parent_id != null ? String(it.parent_id) : "");
    setSlug(it.slug || "");
    setTitle(it.title);
    setPublished(!!it.published);
    setMsg("");
    setBlocks([]);
    const full = await fetch(`/api/content/${it.id}`).then((r) =>
      r.ok ? r.json() : null
    );
    const src = (full && full.item ? full.item : it) as {
      blocks?: any;
      image_data?: string | null;
      body?: string | null;
    };
    const arr = parseBlocks(src.blocks);
    let initial: Block[] = [];
    if (arr.length) {
      initial = arr.map((b: any) =>
        b.type === "image"
          ? {
              id: uid(),
              type: "image",
              url: b.url || "",
              caption: b.caption || "",
              uploading: false,
              preview: !!b.preview,
            }
          : { id: uid(), type: "text", text: b.text || "", preview: !!b.preview }
      );
    } else {
      if (src.image_data)
        initial.push({
          id: uid(),
          type: "image",
          url: src.image_data,
          caption: "",
          uploading: false,
        });
      if (src.body)
        initial.push({ id: uid(), type: "text", text: src.body });
    }
    setBlocks(initial);
  }

  function addText() {
    setBlocks((b) => [...b, { id: uid(), type: "text", text: "", preview: false }]);
  }
  function addImage() {
    setBlocks((b) => [
      ...b,
      { id: uid(), type: "image", url: "", caption: "", uploading: false, preview: false },
    ]);
  }
  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id);
      if (i < 0) return b;
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  // Move a block to a specific 1-based position. The block is removed from
  // its current spot and inserted at the target index; everything at and
  // after the target shifts forward by one (so the previous occupant of
  // that position — and the ones after it — move down/forward).
  function moveBlockTo(id: string, pos: number) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id);
      if (i < 0) return b;
      const target = Math.max(1, Math.min(b.length, pos)) - 1;
      if (target === i) return b;
      const copy = [...b];
      const [item] = copy.splice(i, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }
  function togglePreview(id: string) {
    setBlocks((b) =>
      b.map((x) => (x.id === id ? { ...x, preview: !x.preview } : x))
    );
  }

  async function uploadImageBlock(id: string, file: File) {
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === id && b.type === "image" ? { ...b, uploading: true } : b
      )
    );
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await r.json();
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === id && b.type === "image"
          ? { ...b, uploading: false, url: r.ok ? d.url : b.url }
          : b
      )
    );
    if (!r.ok) setMsg(d.error || "Upload failed.");
  }

  async function save() {
    if (!title) {
      setMsg("Title is required.");
      return;
    }
    if (kind === "post" && !slug) {
      setMsg("Slug is required for posts.");
      return;
    }
    if (kind === "post" && blocks.some((b) => b.type === "image" && b.uploading)) {
      setMsg("Wait for uploads to finish.");
      return;
    }
    const payloadBlocks = blocks
      .filter((b) => (b.type === "image" ? !!b.url : b.text.trim().length > 0))
      .map((b) =>
        b.type === "image"
          ? { type: "image", url: b.url, caption: b.caption, preview: !!b.preview }
          : { type: "text", text: b.text, preview: !!b.preview }
      );
    setBusy(true);
    setMsg("");
    const r = await fetch(
      editing ? `/api/content/${editing.id}` : "/api/content",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          parent_id: parentId ? Number(parentId) : null,
          access,
          slug,
          title,
          body: "",
          image_data: null,
          blocks: payloadBlocks,
          published,
        }),
      }
    );
    setBusy(false);
    if (r.ok) {
      resetForm();
      await load();
      setMsg("Saved.");
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg(d.error || "Save failed.");
    }
  }

  async function del(id: number) {
    if (!confirm("Delete this item? (Deleting a folder removes its contents.)"))
      return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    await load();
  }

  // Move an item one step up/down within its sibling group, then persist
  // the new order via PATCH /api/content/reorder. Sort MUST match the
  // GET (order_index ASC, then id ASC) so the on-screen index equals
  // the index we swap here.
  async function moveItem(id: number, dir: -1 | 1) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const pid = it.parent_id ?? null;
    const sibs = items
      .filter((x) => (x.parent_id ?? null) === pid)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.id - b.id);
    const i = sibs.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sibs.length) return;
    const reordered = [...sibs];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    const payload = reordered.map((x) => ({
      id: x.id,
      parent_id: x.parent_id ?? null,
    }));
    await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    await load();
  }

  const folders = items.filter((i) => (i.kind || "post") === "folder");
  function treeRows(
    parentId: number | null,
    depth: number
  ): ContentItem[] {
    const kids = items
      .filter((i) => (i.parent_id ?? null) === parentId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const out: ContentItem[] = [];
    for (const k of kids) {
      out.push({ ...k, _depth: depth } as any);
      if ((k.kind || "post") === "folder") {
        out.push(...treeRows(k.id, depth + 1));
      }
    }
    return out;
  }
  const rows = treeRows(null, 0);

  // Memoized list of content items. Wrapped in React.memo so that typing
  // in the editor (which only changes `blocks`/form state) does NOT
  // re-render this whole list on every keystroke — that was a major
  // source of the lag. The callbacks are stable via useCallback.
  const ItemList = memo(function ItemList({
    rows,
    folders,
    onEdit,
    onDelete,
    onMove,
  }: {
    rows: ContentItem[];
    folders: ContentItem[];
    onEdit: (it: ContentItem) => void;
    onDelete: (id: number) => void;
    onMove: (id: number, dir: -1 | 1) => void;
  }) {
    return (
      <>
        {rows.map((it) => {
          const depth = (it as any)._depth || 0;
          const isFolder = (it.kind || "post") === "folder";
          const arr = parseBlocks(it.blocks);
          const firstImg =
            arr.find((b: any) => b.type === "image")?.url || it.image_data;
          return (
    <div
      key={it.id}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
      style={{ marginLeft: depth * 12 }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-base">{isFolder ? "📁" : "📄"}</span>
        {firstImg && !isFolder ? (
          <img
            src={firstImg}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 text-white/30">
            {isFolder ? "▦" : "∅"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-bold">{it.title}</span>
            {!isFolder && (it.access || "free") !== "free" && (
              <Badge tone={(it.access as string) === "paid" ? "red" : "white"}>
                {(it.access as string) === "paid" ? "paid" : "preview"}
              </Badge>
            )}
            <Badge tone={it.published ? "green" : "white"}>
              {it.published ? "live" : "draft"}
            </Badge>
          </div>
          <p className="truncate text-xs text-white/45">
            {isFolder ? "folder" : `/${it.slug}`}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-9">
        <button
          className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10"
          onClick={() => onMove(it.id, -1)}
          title="Move up"
        >
          ↑
        </button>
        <button
          className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10"
          onClick={() => onMove(it.id, 1)}
          title="Move down"
        >
          ↓
        </button>
        <GhostButton className="px-3 py-1.5 text-sm" onClick={() => onEdit(it)}>
          Edit
        </GhostButton>
        <GhostButton
          className="px-3 py-1.5 text-sm"
          onClick={() => onDelete(it.id)}
        >
          Delete
        </GhostButton>
      </div>
    </div>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/50">
            No content yet. Create your first item on the right.
          </div>
        )}
      </>
    );
  });

  const handleEdit = useCallback((it: ContentItem) => edit(it), []);
  const handleDelete = useCallback((id: number) => del(id), []);
  const handleMove = useCallback((id: number, dir: -1 | 1) => moveItem(id, dir), []);

  // Vault stats: published posts split by access tier (free/preview/paid).
  // Folders and drafts are counted separately so the tiers always sum to
  // the real "sellable" post count. Target per roadmap: ~70% gated.
  const posts = items.filter((i) => (i.kind || "post") === "post");
  const live = posts.filter((i) => !!i.published);
  const byAccess = {
    free: live.filter((i) => (i.access || "free") === "free").length,
    preview: live.filter((i) => i.access === "preview").length,
    paid: live.filter((i) => i.access === "paid").length,
  };
  const total = live.length || 1;
  const gated = byAccess.preview + byAccess.paid;
  const gatedPct = Math.round((gated / total) * 100);
  const folderCount = items.filter((i) => (i.kind || "post") === "folder").length;
  const draftCount = posts.length - live.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)]">
      <div className="space-y-3">
        <GlassCard className="border-white/15">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-bold">Vault stats</span>
            <span className="text-xs text-white/45">
              {live.length} live posts · {folderCount} folders
              {draftCount > 0 ? ` · ${draftCount} drafts` : ""}
            </span>
          </div>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-white/35"
              style={{ width: `${(byAccess.free / total) * 100}%` }}
              title={`Free: ${byAccess.free}`}
            />
            <div
              className="h-full bg-green-soft/70"
              style={{ width: `${(byAccess.preview / total) * 100}%` }}
              title={`Preview: ${byAccess.preview}`}
            />
            <div
              className="h-full bg-green-glow"
              style={{ width: `${(byAccess.paid / total) * 100}%` }}
              title={`Paid: ${byAccess.paid}`}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(
              [
                { label: "Free", n: byAccess.free, cls: "text-white/70" },
                { label: "Preview", n: byAccess.preview, cls: "text-green-soft" },
                { label: "Paid", n: byAccess.paid, cls: "text-green-glow" },
              ] as const
            ).map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 px-2 py-2">
                <div className={`text-xl font-black ${s.cls}`}>{s.n}</div>
                <div className="text-[11px] uppercase tracking-wide text-white/40">
                  {s.label} · {Math.round((s.n / total) * 100)}%
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/45">
            Gated (preview + paid): <b className={gatedPct >= 70 ? "text-green-glow" : "text-white/70"}>{gated}/{live.length} ({gatedPct}%)</b>
            {gatedPct < 70 ? " — roadmap target is ~70% gated (P1.2)." : " — target reached."}
          </p>
        </GlassCard>
        <GlassCard className="border-green/30">
          <button
            onClick={() => setAiOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-bold text-green-glow">
              ✨ Generate with AI
            </span>
            <span className="text-sm text-white/50">
              {aiOpen ? "▲" : "▼"}
            </span>
          </button>
          {aiOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <Label>What to do with the text</Label>
                <Input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="e.g. Summarize key points · Reformat into a lesson · Extract the bone-mechanics"
                />
              </div>
              <div>
                <Label>Source text (will be transformed into the post)</Label>
                <TextArea
                  value={aiSource}
                  onChange={(e) => setAiSource(e.target.value)}
                  placeholder="Paste the raw text here…"
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Access tier</Label>
                  <select
                    value={aiAccess}
                    onChange={(e) =>
                      setAiAccess(e.target.value as "free" | "preview" | "paid")
                    }
                    className="field"
                  >
                    <option value="free">Free</option>
                    <option value="preview">Preview</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <Label>Nest under folder</Label>
                  <select
                    value={aiParent}
                    onChange={(e) => setAiParent(e.target.value)}
                    className="field"
                  >
                    <option value="">— Top level —</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <PrimaryButton
                tone="green"
                className="w-full"
                onClick={generateAi}
                disabled={aiBusy}
              >
                {aiBusy ? "Generating…" : "Generate draft"}
              </PrimaryButton>
              <p className="text-xs text-white/45">
                Creates a <b className="text-white/70">draft</b> post (Markdown
                text blocks with bullet points). You then open it to reorder,
                toggle previews and add images before publishing.
              </p>
            </div>
          )}
          {aiMsg && <p className="mt-2 text-sm text-green-glow">{aiMsg}</p>}
        </GlassCard>
        <ItemList
          rows={rows}
          folders={folders}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMove={handleMove}
        />
      </div>

      <div className="h-fit rounded-3xl border border-white/10 bg-[#0c0c0e] p-6 sm:p-8">
        <h3 className="text-lg font-bold">
          {editing ? "Edit item" : "New item"}
        </h3>
        <p className="mt-1 text-xs text-white/45">
          Create a folder to group topics, or a post (text + image blocks) nested
          under any folder. Posts show as titles in the vault and expand on click.
        </p>

        {editing && kind === "post" && (
          <GlassCard className="border-green/30">
            <button
              onClick={() => setAiEditOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-bold text-green-glow">
                ✨ AI-edit this post
              </span>
              <span className="text-sm text-white/50">
                {aiEditOpen ? "▲" : "▼"}
              </span>
            </button>
            {aiEditOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label>What to change in the existing text</Label>
                  <TextArea
                    value={aiEditInstr}
                    onChange={(e) => setAiEditInstr(e.target.value)}
                    placeholder="e.g. Improve grammar · Rephrase from the bone-mechanics angle · Make it more concise"
                    className="min-h-[90px]"
                  />
                </div>
                <PrimaryButton
                  tone="green"
                  className="w-full"
                  onClick={aiEditPost}
                  disabled={aiEditBusy}
                >
                  {aiEditBusy ? "Editing…" : "Run AI edit"}
                </PrimaryButton>
                <p className="text-xs text-white/45">
                  Rewrites ONLY the text blocks of this post per your instruction
                  (keeps images, order and previews). Review the result below,
                  then click <b className="text-white/70">Save</b> to persist.
                </p>
              </div>
            )}
            {aiEditMsg && (
              <p className="mt-2 text-sm text-green-glow">{aiEditMsg}</p>
            )}
          </GlassCard>
        )}

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["post", "folder"] as const).map((k: "post" | "folder") => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${
                  kind === k ? "btn-red" : "btn-ghost"
                }`}
              >
                {k === "post" ? "📄 Post" : "📁 Folder"}
              </button>
            ))}
          </div>

          <div>
            <Label>Parent (nest under)</Label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="field"
            >
              <option value="">— Top level —</option>
              {folders
                .filter((f) => f.id !== (editing?.id ?? -1))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
            </select>
          </div>

          {kind === "post" && (
            <div>
              <Label>Access tier</Label>
              <select
                value={access}
                onChange={(e) =>
                  setAccess(e.target.value as "free" | "preview" | "paid")
                }
                className="field"
              >
                <option value="free">Free — everyone can read</option>
                <option value="preview">Preview — teaser, then gate</option>
                <option value="paid">Paid — members only</option>
              </select>
            </div>
          )}

          {kind === "post" && (
            <div>
              <Label>Slug (unique URL id)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-first-lesson"
              />
            </div>
          )}
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "folder" ? "Topic name" : "Lesson title"}
            />
          </div>

          {kind === "post" && (
            <div className="space-y-3">
              {blocks.map((b, i) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {b.type === "image" ? "Image" : "Text"} #{i + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <label
                        className="flex items-center gap-1 text-[11px] text-white/45"
                        title="Move this block to a specific position (1 = top). Blocks after it shift down."
                      >
                        to #
                        <input
                          type="number"
                          min={1}
                          max={blocks.length}
                          defaultValue={i + 1}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v >= 1 && v <= blocks.length) moveBlockTo(b.id, v);
                            else e.target.value = String(i + 1);
                          }}
                          className="field !w-14 !py-1 text-center text-xs"
                        />
                      </label>
                      <button
                        className={`rounded-md px-2 py-1 text-xs ${
                          b.preview
                            ? "bg-green/15 text-green-glow"
                            : "text-white/60 hover:bg-white/10"
                        }`}
                        onClick={() => togglePreview(b.id)}
                        title="Show this block to free users as a preview"
                      >
                        {b.preview ? "Preview ✓" : "Preview"}
                      </button>
                      <button
                        className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                        onClick={() => moveBlock(b.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                        onClick={() => moveBlock(b.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="rounded-md px-2 py-1 text-xs text-red-glow hover:bg-white/10"
                        onClick={() => removeBlock(b.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {b.type === "text" ? (
                    <AutoTextarea
                      value={b.text}
                      onChange={(v) =>
                        setBlocks((bs) =>
                          bs.map((x) =>
                            x.id === b.id && x.type === "text"
                              ? { ...x, text: v }
                              : x
                          )
                        )
                      }
                      placeholder="Write this section…"
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImageBlock(b.id, f);
                        }}
                        className="block w-full text-sm text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white/80"
                      />
                      {b.uploading && (
                        <p className="mt-2 text-xs text-white/50">Uploading…</p>
                      )}
                      {b.url && (
                        <img
                          src={b.url}
                          alt=""
                          className="mt-3 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      <input
                        value={b.caption}
                        onChange={(e) =>
                          setBlocks((bs) =>
                            bs.map((x) =>
                              x.id === b.id && x.type === "image"
                                ? { ...x, caption: e.target.value }
                                : x
                            )
                          )
                        }
                        placeholder="Caption (optional)"
                        className="field mt-2"
                      />
                    </div>
                  )}
                </div>
              ))}
              {blocks.length === 0 && (
                <p className="text-sm text-white/40">
                  No blocks yet. Add a text or image block below.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={addText}
                  className="flex-1 rounded-full border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5"
                >
                  + Text
                </button>
                <button
                  onClick={addImage}
                  className="flex-1 rounded-full border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5"
                >
                  + Image
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-red"
            />
            Published (visible to members)
          </label>
          {msg && <p className="text-sm text-red-glow">{msg}</p>}
          <div className="flex gap-2">
            <PrimaryButton className="flex-1" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </PrimaryButton>
            {editing && <GhostButton onClick={resetForm}>Cancel</GhostButton>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PAYMENTS (manual verification) ---------------- */
function PaymentsTab() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tx, setTx] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const c = await fetch("/api/admin/payments").then((r) =>
      r.ok ? r.json() : null
    );
    if (c) setPayments(c.payments || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function approve(p: PendingPayment) {
    setBusyId(p.order_id);
    const r = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: p.order_id,
        txHash: tx[p.order_id] || null,
        network: p.network || p.coin,
      }),
    });
    setBusyId(null);
    if (r.ok) {
      setMsg(`Granted access to ${p.email}.`);
      await load();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg(d.error || "Failed.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">
        Members who generated an invoice but haven’t been verified yet. Once
        you’ve seen the transfer arrive in your wallet, click{" "}
        <span className="text-red-glow">Verify & grant</span>.
      </p>
      {payments.map((p) => {
        const plan = PLANS.find((pl: Plan) => pl.key === p.plan_key);
        const explorer =
          p.tx_hash && p.coin === "USDT" && /tron/i.test(p.network || "")
            ? `https://tronscan.org/#/transaction/${p.tx_hash}`
            : p.tx_hash && /btc/i.test(p.coin || p.network || "")
            ? `https://www.blockchain.com/btc/tx/${p.tx_hash}`
            : p.tx_hash && /eth|erc/i.test(p.coin || p.network || "")
            ? `https://etherscan.io/tx/${p.tx_hash}`
            : p.tx_hash && /sol/i.test(p.coin || p.network || "")
            ? `https://solscan.io/tx/${p.tx_hash}`
            : null;
        return (
          <GlassCard key={p.order_id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold">{p.email}</div>
                <div className="text-sm text-white/50">
                  {p.amount ?? "?"} {p.coin ?? ""} · {p.network ?? ""} ·{" "}
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                pending
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-green/15 px-3 py-1 font-semibold text-green-glow">
                {plan ? plan.name : (p.plan_key || "plan")}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-white/60">
                ref: {p.order_id}
              </span>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-xs text-white/45">
                User-submitted transaction hash (proof of payment)
              </div>
              {p.tx_hash ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-sm text-white/80">
                    {p.tx_hash}
                  </span>
                  {explorer && (
                    <a
                      href={explorer}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md bg-green/15 px-2 py-1 text-xs font-semibold text-green-glow hover:bg-green/25"
                    >
                      View on explorer ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-red-glow">
                  ⚠ No TX hash submitted yet — user has NOT sent proof of payment.
                </p>
              )}
            </div>
            <div>
              <Label>Note / override TX hash (optional)</Label>
              <Input
                value={tx[p.order_id] || ""}
                onChange={(e) =>
                  setTx((t) => ({ ...t, [p.order_id]: e.target.value }))
                }
                placeholder="0x… / Tron tx id"
              />
            </div>
            <PrimaryButton
              className="w-full"
              onClick={() => approve(p)}
              disabled={busyId === p.order_id}
            >
              {busyId === p.order_id ? "Granting…" : "Verify & grant access"}
            </PrimaryButton>
          </GlassCard>
        );
      })}
      {payments.length === 0 && (
        <GlassCard className="text-center text-white/50">
          No pending payments. 🎉
        </GlassCard>
      )}
      {msg && <p className="text-sm text-red-glow">{msg}</p>}
    </div>
  );
}

/* ---------------- SUPPORT ---------------- */
function SupportTab() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upying, setUpying] = useState(false);

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

  async function load() {
    const t = await fetch("/api/support").then((r) =>
      r.ok ? r.json() : null
    );
    if (t) setThreads(t.threads || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function open(id: number) {
    setActive(id);
    const m = await fetch(`/api/support/${id}`).then((r) =>
      r.ok ? r.json() : null
    );
    if (m) setMessages(m.messages || []);
  }

  async function reply() {
    if (!active || (!draft.trim() && !pendingImg)) return;
    setBusy(true);
    const r = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: active, body: draft, imageUrl: pendingImg }),
    });
    setBusy(false);
    if (r.ok) {
      setDraft("");
      setPendingImg(null);
      await open(active);
      await load();
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <div className="space-y-2">
        {threads.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-2xl p-3 glass ${
              active === t.id ? "ring-1 ring-red/50" : ""
            }`}
          >
            <button
              onClick={() => open(t.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{t.user_email}</span>
                <Badge tone={t.status === "open" ? "red" : "green"}>
                  {t.status}
                </Badge>
              </div>
              <p className="truncate text-xs text-white/45">
                {t.last_msg || t.subject || "No messages"}
              </p>
            </button>
            <button
              onClick={async () => {
                if (
                  !confirm(
                    "Delete this entire conversation (all messages + images) permanently?"
                  )
                )
                  return;
                const r = await fetch(`/api/support/${t.id}`, {
                  method: "DELETE",
                });
                if (r.ok) {
                  if (active === t.id) {
                    setActive(null);
                    setMessages([]);
                  }
                  await load();
                }
              }}
              title="Delete this conversation permanently"
              className="shrink-0 rounded-md px-2 py-1 text-xs text-red-glow hover:bg-white/10"
            >
              🗑
            </button>
          </div>
        ))}
        {threads.length === 0 && (
          <p className="px-1 text-sm text-white/40">No support threads.</p>
        )}
      </div>

      <GlassCard className="flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-white/40">Select a thread.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.sender === "admin" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender === "admin" ? "btn-red" : "bg-white/10"
                }`}
              >
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {m.image_url && (
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
              disabled={!active}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
              }}
            />
          </label>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to member…"
            disabled={!active}
            onKeyDown={(e) => {
              if (e.key === "Enter") reply();
            }}
          />
          <PrimaryButton
            onClick={reply}
            disabled={busy || !active || (!draft.trim() && !pendingImg)}
          >
            {busy ? "…" : "Send"}
          </PrimaryButton>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- USERS ---------------- */
type Stats = {
  range: string;
  totalSignups: number;
  paid19: number;
  paid49: number;
  paid99: number;
};

const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [grantPlans, setGrantPlans] = useState<Record<number, string>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState<string>("all");

  async function loadStats(r: string) {
    const d = await fetch(`/api/admin/users?range=${r}`).then((res) =>
      res.ok ? res.json() : null
    );
    if (d?.stats) setStats(d.stats);
  }

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setUsers(d.users || []);
        const init: Record<number, string> = {};
        for (const u of d.users || []) {
          init[u.id] = u.sub_plan_key || PLANS[0].key;
        }
        setGrantPlans(init);
        if (d.stats) setStats(d.stats);
      });
  }, []);

  function changeRange(r: string) {
    setRange(r);
    loadStats(r);
  }

  async function act(id: number, action: "grant" | "revoke", planKey?: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, planKey }),
    });
    const d = await fetch("/api/admin/users").then((r) => r.json());
    setUsers(d.users || []);
    const init: Record<number, string> = {};
    for (const u of d.users || []) {
      init[u.id] = u.sub_plan_key || PLANS[0].key;
    }
    setGrantPlans(init);
  }

  async function del(id: number) {
    if (
      !confirm(
        "Permanently delete this user AND all their data (subscriptions, support threads + messages)? This cannot be undone."
      )
    )
      return;
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (r.ok) {
      const d = await fetch("/api/admin/users").then((r) => r.json());
      setUsers(d.users || []);
      const init: Record<number, string> = {};
      for (const u of d.users || []) {
        init[u.id] = u.sub_plan_key || PLANS[0].key;
      }
      setGrantPlans(init);
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "Delete failed.");
    }
  }

  return (
    <div className="space-y-3">
      <GlassCard className="border-red/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-2xl font-black text-white">
                {stats ? stats.totalSignups : "—"}
              </div>
              <div className="text-xs text-white/45">Total sign-ups</div>
            </div>
            {/* Joiner velocity: computed client-side from the full users
                list (created_at is returned by the API for every row). */}
            <div>
              <div className="text-2xl font-black text-white">
                {
                  users.filter((u) => {
                    if (!u.created_at) return false;
                    const t = new Date(
                      u.created_at.replace(" ", "T") + "Z"
                    ).getTime();
                    return !isNaN(t) && t >= Date.now() - 7 * 86400000;
                  }).length
                }
              </div>
              <div className="text-xs text-white/45">Joined last 7 days</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">
                {
                  users.filter((u) => {
                    if (!u.created_at) return false;
                    const t = new Date(
                      u.created_at.replace(" ", "T") + "Z"
                    ).getTime();
                    return !isNaN(t) && t >= Date.now() - 30 * 86400000;
                  }).length
                }
              </div>
              <div className="text-xs text-white/45">Joined last 30 days</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-glow">
                {stats ? stats.paid19 : "—"}
              </div>
              <div className="text-xs text-white/45">Paid · 19 USDT</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-glow">
                {stats ? stats.paid49 : "—"}
              </div>
              <div className="text-xs text-white/45">Paid · 49 USDT</div>
            </div>
            <div>
              <div className="text-2xl font-black text-green-glow">
                {stats ? stats.paid99 : "—"}
              </div>
              <div className="text-xs text-white/45">Paid · 99 USDT</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => changeRange(r.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  range === r.key
                    ? "bg-red text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {users.map((u) => {
        const purchased = planLabel(u.sub_plan_key, u.sub_status, u.sub_amount);
        const sel = grantPlans[u.id] || u.sub_plan_key || PLANS[0].key;
        return (
          <GlassCard key={u.id} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{u.email}</span>
                {u.role === "admin" && <Badge tone="red">admin</Badge>}
              </div>
              {u.created_at && (
                <p className="mt-1 text-xs text-white/45">
                  Joined{" "}
                  {new Date(u.created_at.replace(" ", "T") + "Z").toLocaleDateString()}
                </p>
              )}
              {u.role !== "admin" && (
                <p className="mt-1 text-sm">
                  <span className="text-white/45">Purchased tier: </span>
                  <span className="font-semibold text-green-glow">{purchased}</span>
                </p>
              )}
              <p className="text-xs text-white/45">
                {u.sub_status ? (
                  <>
                    Status: <span className="text-white/70">{u.sub_status}</span>
                    {u.sub_expires &&
                      ` · until ${new Date(u.sub_expires).toLocaleDateString()}`}
                  </>
                ) : (
                  "No subscription yet"
                )}
              </p>
              {u.sub_status === "pending" && u.sub_tx_hash && (
                <div className="mt-2 rounded-xl bg-white/5 p-2">
                  <div className="text-[11px] text-white/45">
                    Proof of payment (TX hash)
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs text-white/80">
                      {u.sub_tx_hash}
                    </span>
                    <a
                      href={
                        /btc/i.test(u.sub_network || "")
                          ? `https://www.blockchain.com/btc/tx/${u.sub_tx_hash}`
                          : /eth|erc/i.test(u.sub_network || "")
                          ? `https://etherscan.io/tx/${u.sub_tx_hash}`
                          : /sol/i.test(u.sub_network || "")
                          ? `https://solscan.io/tx/${u.sub_tx_hash}`
                          : `https://tronscan.org/#/transaction/${u.sub_tx_hash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md bg-green/15 px-2 py-1 text-[11px] font-semibold text-green-glow hover:bg-green/25"
                    >
                      View on explorer ↗
                    </a>
                  </div>
                </div>
              )}
              {u.sub_status === "pending" && !u.sub_tx_hash && (
                <p className="mt-2 text-xs text-red-glow">
                  ⚠ No TX hash submitted — user has NOT sent proof of payment.
                </p>
              )}
            </div>
            {u.role !== "admin" && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sel}
                  onChange={(e) =>
                    setGrantPlans((g) => ({ ...g, [u.id]: e.target.value }))
                  }
                  className="field !w-auto !py-2 text-sm"
                >
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.price} USDT · {p.name}
                    </option>
                  ))}
                </select>
                <PrimaryButton
                  className="px-4 py-2 text-sm"
                  onClick={() => act(u.id, "grant", sel)}
                >
                  Grant selected
                </PrimaryButton>
                <GhostButton
                  className="px-4 py-2 text-sm"
                  onClick={() => act(u.id, "revoke")}
                >
                  Revoke
                </GhostButton>
                <GhostButton
                  className="px-4 py-2 text-sm text-red-glow"
                  onClick={() => del(u.id)}
                >
                  Delete
                </GhostButton>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}