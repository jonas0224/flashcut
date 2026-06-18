"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "@/components/PageShell";

/** Legacy route — reveal now lives on the main play page. */
export default function RoundRankingsPage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/room/${code}`);
  }, [code, router]);

  return (
    <PageShell>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-xl font-bold text-white">Loading…</p>
      </main>
    </PageShell>
  );
}
