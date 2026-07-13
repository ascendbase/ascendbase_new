"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Login failed.");
        setBusy(false);
        return;
      }
      router.push(data.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav />
      <Container className="flex min-h-[80vh] items-center justify-center py-12">
        <GlassCard className="w-full max-w-md fade-up">
          <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-white/55">Log in to reach the vault.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red/15 px-3 py-2 text-sm text-red-glow">
                {error}
              </p>
            )}
            <PrimaryButton type="submit" className="w-full" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </PrimaryButton>
          </form>
          <p className="mt-5 text-center text-sm text-white/50">
            New here?{" "}
            <Link href="/signup" className="text-red-glow font-semibold">
              Get access
            </Link>
          </p>
        </GlassCard>
      </Container>
    </>
  );
}
