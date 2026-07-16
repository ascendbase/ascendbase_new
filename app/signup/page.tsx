"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { Container, GlassCard, PrimaryButton, Input, Label, Badge } from "@/components/ui";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (me && me.user) {
        setLoggedIn(true);
      }
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Sign up failed.");
        setBusy(false);
        return;
      }
      router.push("/checkout");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  // Already logged in → point them at the paid plans instead of the form.
  if (loggedIn) {
    return (
      <>
        <SiteNav />
        <Container className="flex min-h-[80vh] items-center justify-center py-12">
          <GlassCard className="w-full max-w-md fade-up text-center">
            <Badge tone="red">You're in</Badge>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              Ready to go further?
            </h1>
            <p className="mt-2 text-sm text-white/55">
              You're already signed in. Unlock the full vault, personal
              looksmaxing advice, or 1-on-1 coaching.
            </p>
            <Link href="/checkout" className="mt-6 block">
              <PrimaryButton className="w-full">View plans & unlock →</PrimaryButton>
            </Link>
            <Link
              href="/dashboard"
              className="mt-3 block text-sm text-white/50 hover:text-white"
            >
              Or go to the vault
            </Link>
          </GlassCard>
        </Container>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <Container className="flex min-h-[80vh] items-center justify-center py-12">
        <GlassCard className="w-full max-w-md fade-up">
          <h1 className="text-2xl font-black tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-white/55">
            Some vault content is open to everyone. Upgrade
            anytime with crypto (any wallet) to unlock everything.
          </p>
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
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red/15 px-3 py-2 text-sm text-red-glow">
                {error}
              </p>
            )}
            <PrimaryButton type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create account →"}
            </PrimaryButton>
          </form>
          <p className="mt-5 text-center text-sm text-white/50">
            Already have access?{" "}
            <Link href="/login" className="text-red-glow font-semibold">
              Log in
            </Link>
          </p>
        </GlassCard>
      </Container>
    </>
  );
}