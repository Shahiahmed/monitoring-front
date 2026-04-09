"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IncidentsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/incidents/events");
  }, [router]);
  return null;
}
