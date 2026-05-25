"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import AddIncidentForm from "../add-incident-form";

function PrtgGuard() {
  const router = useRouter();

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
      const isAdmin = u?.roles?.some((r: { code?: string } | string) =>
        ["ADMIN", "SUPER_ADMIN"].includes(typeof r === "string" ? r : (r.code ?? ""))
      );
      if (!isAdmin) router.replace("/incidents/events");
    } catch {
      router.replace("/incidents/events");
    }
  }, [router]);

  return <AddIncidentForm mode="prtg" pathPrefix="/incidents/add/prtg" />;
}

export default function AddIncidentPrtgPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 px-6 py-10">
          <span className="text-sm text-gray-400">Загрузка…</span>
        </div>
      }
    >
      <PrtgGuard />
    </Suspense>
  );
}
