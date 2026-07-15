"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const AdminInner = dynamic(() => import("./inner"), { ssr: false });

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [Inner, setInner] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) =>
        r.ok ? r.json() : null
      );
      if (!me || !me.user || me.user.role !== "admin") {
        router.replace("/");
        return;
      }
      // Lazy-load the admin UI chunk now that we know it's an admin.
      const mod = await import("./inner");
      setInner(() => mod.default);
      setReady(true);
    })();
  }, [router]);

  if (!ready || !Inner) {
    return (
      <div className="grid min-h-screen place-items-center text-white/50">
        Loading…
      </div>
    );
  }

  return <Inner />;
}