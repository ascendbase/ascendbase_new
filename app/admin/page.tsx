"use client";

import { useEffect, useState } from "react";
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
  sub_status: string | null;
  sub_expires: string | null;
  sub_plan_key: string | null;
  sub_amount: number | null;
};

function planLabel(
  key: string | null,
  status: string | null,
  amount?: number | null
): string {
  // Resolve the plan: prefer plan_key, otherwise match by the stored
  // amount (handles legacy pending rows with a NULL plan_key).
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

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"content" | "payments" | "support" | "users">(
    "content"
  );

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
          {(["content", "payments", "support", "users"] as const).map((t) => (
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
        </div>
      </Container>
    </>
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

  async function load() {
    const c = await fetch("/api/content").then((r) =>
      r.ok ? r.json() : null
    );
    if (c) setItems(c.items || []);
  }
  useEffect(() => {
    load();
  }, []);

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

  function parseBlocks(raw: any): any[] {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw || []);
    try {
      const arr = JSON.parse(str || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

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
    // The content tree omits blocks (for fast lazy loading), so fetch the
    // full item to populate the editor with its text/image blocks.
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

  // Build a tree for the left list (folders first, indented).
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
      <div className="space-y-3">
        {rows.map((it) => {
          const depth = (it as any)._depth || 0;
          const isFolder = (it.kind || "post") === "folder";
          const arr = parseBlocks(it.blocks);
          const firstImg =
            arr.find((b: any) => b.type === "image")?.url || it.image_data;
          return (
            <GlassCard
              key={it.id}
              className="flex items-center gap-4"
              style={{ marginLeft: depth * 16 }}
            >
              <span className="text-lg">{isFolder ? "📁" : "📄"}</span>
              {firstImg && !isFolder ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstImg}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/5 text-white/30">
                  {isFolder ? "▦" : "∅"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
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
                <p className="truncate text-sm text-white/45">
                  {isFolder ? "folder" : `/${it.slug}`}
                </p>
              </div>
              <GhostButton className="px-4 py-2 text-sm" onClick={() => edit(it)}>
                Edit
              </GhostButton>
              <GhostButton
                className="px-4 py-2 text-sm"
                onClick={() => del(it.id)}
              >
                Delete
              </GhostButton>
            </GlassCard>
          );
        })}
        {items.length === 0 && (
          <GlassCard className="text-center text-white/50">
            No content yet. Create your first item on the right.
          </GlassCard>
        )}
      </div>

      <GlassCard className="h-fit lg:sticky lg:top-24">
        <h3 className="text-lg font-bold">
          {editing ? "Edit item" : "New item"}
        </h3>
        <p className="mt-1 text-xs text-white/45">
          Create a folder to group topics, or a post (text + image blocks) nested
          under any folder. Posts show as titles in the vault and expand on click.
        </p>
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
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {b.type === "image" ? "Image" : "Text"} #{i + 1}
                    </span>
                    <div className="flex gap-1">
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
                    <TextArea
                      value={b.text}
                      onChange={(e) =>
                        setBlocks((bs) =>
                          bs.map((x) =>
                            x.id === b.id && x.type === "text"
                              ? { ...x, text: e.target.value }
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
                        // eslint-disable-next-line @next/next/no-img-element
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
      </GlassCard>
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
        <span className="text-red-glow">Verify &amp; grant</span>.
      </p>
          {payments.map((p) => {
        const plan = PLANS.find((pl: Plan) => pl.key === p.plan_key);
        // Build a block-explorer link from the user-submitted TX hash so
        // you can confirm the exact transfer that matches this user.
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
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  // Per-user selected grant plan, defaulting to what they actually purchased.
  const [grantPlans, setGrantPlans] = useState<Record<number, string>>({});
  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setUsers(d.users || []);
        // Default each user's grant selector to their purchased/active plan.
        const init: Record<number, string> = {};
        for (const u of d.users || []) {
          init[u.id] = u.sub_plan_key || PLANS[0].key;
        }
        setGrantPlans(init);
      });
  }, []);

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
