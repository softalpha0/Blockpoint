"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { children: ReactNode };

export default function DashboardLayout({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const r = await fetch("/api/siwe/session", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));

        if (!alive) return;

        if (j?.ok) {
          setOk(true);
        } else {
          setOk(false);
          router.replace("/login");
        }
      } catch {
        if (!alive) return;
        setOk(false);
        router.replace("/login");
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="container">
        <div className="section" style={{ marginTop: 18 }}>
          <div className="card">
            <div style={{ height: 12, width: 220, borderRadius: 8, background: "rgba(255,255,255,0.10)" }} />
            <div style={{ height: 10 }} />
            <div style={{ height: 12, width: 160, borderRadius: 8, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ height: 10 }} />
            <div style={{ height: 12, width: 260, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>
    );
  }

  // If not ok, we already redirected
  if (!ok) return null;

  return <>{children}</>;
}