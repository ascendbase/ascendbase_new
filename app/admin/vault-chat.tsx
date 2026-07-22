"use client";

import { useState } from "react";
import { GlassCard, Input, PrimaryButton } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

export default function VaultChatTab() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("");

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/vault-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          model: model.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (r.ok && d.reply) {
        setMessages((m) => [...m, { role: "assistant", content: d.reply }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `⚠ ${d.error || "Vault chat failed."}`,
          },
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠ ${e?.message || e}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard className="flex h-[70vh] flex-col">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-green-glow">🗂 Vault Chat</h3>
        <p className="mt-1 text-xs text-white/45">
          Chat with the entire Turso vault dataset. Mention a post by id (e.g.
          "#42"), slug, or title and the assistant will pull its full content to
          ground its answer. No content is created — this is read-only Q&A.
        </p>
      </div>

      <div className="mb-2">
        <label className="mb-1.5 block text-[13px] font-medium text-white/60">
          Model override (optional)
        </label>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. anthropic/claude-3.5-sonnet (defaults to env)"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/[0.02] p-3">
        {messages.length === 0 && (
          <p className="text-sm text-white/40">
            Ask anything about the vault — e.g. "Summarize what post #12 says
            about maxillary advancement" or "Which posts cover forward growth?"
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "btn-red"
                  : "border border-white/10 bg-white/[0.04] text-white/90"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/50">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about or reference a specific post…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <PrimaryButton
          tone="green"
          onClick={send}
          disabled={busy || !input.trim()}
        >
          {busy ? "…" : "Send"}
        </PrimaryButton>
      </div>
    </GlassCard>
  );
}