"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import MusicPlayer from "@/components/MusicPlayer";
import { Container, GlassCard, PrimaryButton, Badge } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";

type Node = {
  id: number;
  slug: string | null;
  title: string;
  kind: "folder" | "post";
  parent_id: number | null;
  order_index: number;
  published: number;
  access?: string;
};

type Block = { type: "text" | "image"; text?: string; url?: string; caption?: string };

function parseBlocks(raw: any): Block[] | null {
  if (!raw) return null;
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  try {
    const arr = JSON.parse(str || "[]");
    if (Array.isArray(arr) && arr.length) return arr as Block[];
  } catch {
    /* ignore */
  }
  return null;
}

function BlockView({ b }: { b: Block }) {
  if (b.type === "image") {
    return (
      <figure className="my-4 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={b.url}
          alt={b.caption || ""}
          className="vault-img max-h-[420px] w-full max-w-2xl rounded-2xl object-contain"
          loading="lazy"
        />
        {b.caption && (
          <figcaption className="mt-2 text-center text-xs text-white/40">
            {b.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  return (
    <div
      className="md-body text-[15px] leading-relaxed text-white/80"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(b.text || "") }}
    />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [err, setErr] = useState("");

  // openFolders: set of folder ids the user expanded.
  const [openFolders, setOpenFolders] = useState<Set<number>>(new Set());
  // openPost: id of the post currently expanded (lazy loaded).
  const [openPost, setOpenPost] = useState<number | null>(null);
  const [postData, setPostData] = useState<Record<number, any>>({});
  const [postLoading, setPostLoading] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user) {
        router.replace("/login");
        return;
      }
      const paid =
        me.user.role === "admin" ||
        (me.subscription && me.subscription.status === "active");
      // Free users (no active sub) stay on the vault — freemium model.
      if (!paid && me.user.role !== "admin") {
        setIsPaid(false);
      } else {
        setIsPaid(!!paid);
      }
      setAccessUntil(me.subscription?.expiresAt || null);
      const c = await fetch("/api/content").then((r) =>
        r.ok ? r.json() : null
      );
      if (c && c.items) setNodes(c.items as Node[]);
      else if (c && c.error) setErr(c.error);
      setLoading(false);
    })();
  }, [router]);

  // Build a children map: parent_id -> sorted children.
  const childrenOf = useMemo(() => {
    const map = new Map<number | null, Node[]>();
    for (const n of nodes) {
      const key = n.parent_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.order_index - b.order_index || a.id - b.id);
    }
    return map;
  }, [nodes]);

  function toggleFolder(id: number) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function togglePost(id: number) {
    if (openPost === id) {
      setOpenPost(null);
      return;
    }
    setOpenPost(id);
    if (!postData[id]) {
      setPostLoading(id);
      const res = await fetch(`/api/content/${id}`);
      setPostLoading(null);
      if (res.ok) {
        const r = await res.json();
        if (r.item) setPostData((prev) => ({ ...prev, [id]: r.item }));
      } else if (res.status === 403) {
        // Paid-only post for a free user.
        setPostData((prev) => ({ ...prev, [id]: { locked: true, title: "" } }));
      } else {
        setPostData((prev) => ({ ...prev, [id]: { error: true } }));
      }
    }
  }

  function renderTree(parentId: number | null, depth: number): React.ReactNode {
    const kids = childrenOf.get(parentId) || [];
    return kids.map((n) => {
      if (n.kind === "folder") {
        const open = openFolders.has(n.id);
        return (
          <div key={n.id}>
            <button
              onClick={() => toggleFolder(n.id)}
              className="tree-indent flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-white/80 hover:bg-white/5"
              style={{ ["--d" as any]: depth }}
            >
              <span className="text-white/40">{open ? "▾" : "▸"}</span>
              <span className="text-base">{open ? "📂" : "📁"}</span>
              {n.title}
            </button>
            {open && renderTree(n.id, depth + 1)}
          </div>
        );
      }
      // post
      const open = openPost === n.id;
      const data = postData[n.id];
      return (
        <div key={n.id}>
          <button
            onClick={() => togglePost(n.id)}
            className="tree-indent flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5"
            style={{ ["--d" as any]: depth }}
          >
            <span className="text-white/40">{open ? "▾" : "▸"}</span>
            <span>📄</span>
            {n.title}
          </button>
          {open && (
            <div
              className="tree-content my-2 rounded-2xl border border-white/10 bg-black/30 p-4"
              style={{ ["--d" as any]: depth }}
            >
              {postLoading === n.id && (
                <p className="text-sm text-white/40">Loading…</p>
              )}
              {!postLoading && data && data.locked && (
                <div className="relative">
                  {/* Paid-only: blurred teaser to hint at the content. */}
                  <div
                    className="pointer-events-none select-none space-y-2 blur-[6px] opacity-60"
                    aria-hidden
                  >
                    {parseBlocks(data.blocks) ? (
                      parseBlocks(data.blocks)!.map((b, i) => (
                        <BlockView key={i} b={b} />
                      ))
                    ) : data.image_data ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.image_data}
                        alt=""
                        className="vault-img h-44 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <p className="text-sm text-white/55">{data.body || ""}</p>
                    )}
                  </div>
                  <div className="mt-3 space-y-3 rounded-2xl border border-red/30 bg-red/10 p-4 text-center">
                    <p className="text-sm text-white/70">
                      🔒 This post is for paid members only.
                    </p>
                    <Link href="/checkout">
                      <PrimaryButton className="px-5 py-2 text-sm">
                        Unlock with crypto →
                      </PrimaryButton>
                    </Link>
                  </div>
                </div>
              )}
              {!postLoading && data && data.preview && (
                <div className="space-y-2">
                  {/* Preview: the admin-flagged blocks shown clearly. */}
                  {parseBlocks(data.blocks) ? (
                    parseBlocks(data.blocks)!.map((b, i) => (
                      <BlockView key={i} b={b} />
                    ))
                  ) : (
                    <p className="text-sm text-white/55">{data.body || ""}</p>
                  )}
                  <div className="mt-3 space-y-3 rounded-2xl border border-green/30 bg-green/10 p-4 text-center">
                    <p className="text-sm text-white/70">
                      ✨ That’s a preview. Unlock the full post with crypto.
                    </p>
                    <Link href="/checkout">
                      <PrimaryButton tone="green" className="px-5 py-2 text-sm">
                        Unlock with crypto →
                      </PrimaryButton>
                    </Link>
                  </div>
                </div>
              )}
              {!postLoading && data && data.error && (
                <p className="text-sm text-red-glow">Failed to load.</p>
              )}
                  {!postLoading && data && !data.locked && !data.preview && !data.error && (
                <div className="space-y-2">
                  {parseBlocks(data.blocks) ? (
                    parseBlocks(data.blocks)!.map((b, i) => (
                      <BlockView key={i} b={b} />
                    ))
                  ) : (
                    <>
                      {data.image_data && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.image_data}
                          alt={data.title}
                          className="vault-img h-44 w-full rounded-2xl object-cover"
                        />
                      )}
                      <p className="whitespace-pre-wrap text-sm text-white/55">
                        {data.body || ""}
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setOpenPost(null)}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5"
                >
                  Close ✕
                </button>
              </div>
            </div>
          )}
        </div>
      );
    });
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  return (
    <>
      <SiteNav />
      <Container className="py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone={isPaid ? "green" : "white"}>
              {isPaid ? "Paid access" : "Free tier"}
            </Badge>
            <h1 className="mt-3 text-3xl font-black tracking-tight">The Vault</h1>
            {isPaid && accessUntil && (
              <p className="mt-1 text-sm text-white/50">
                Open until {new Date(accessUntil).toLocaleDateString()}
              </p>
            )}
            {!isPaid && (
              <p className="mt-1 text-sm text-white/50">
                Free content is open. Unlock everything with crypto anytime.
              </p>
            )}
          </div>
          {!isPaid ? (
            <Link href="/checkout">
              <PrimaryButton>Unlock full vault →</PrimaryButton>
            </Link>
          ) : null}
        </div>

        {err && <p className="mb-4 text-red-glow">{err}</p>}

        <GlassCard className="p-3">
          {nodes.length === 0 ? (
            <p className="px-3 py-6 text-center text-white/50">
              No content published yet — check back soon.
            </p>
          ) : (
            renderTree(null, 0)
          )}
        </GlassCard>
      </Container>
      <MusicPlayer />
    </>
  );
}
