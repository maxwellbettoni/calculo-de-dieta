"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redireciona rota antiga de consultório. */
export default function ConfigRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/conta");
  }, [router]);
  return (
    <div className="grid min-h-screen place-items-center text-slate-500">Abrindo…</div>
  );
}
