"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddIncidentPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/incidents/events");
  }, [router]);
  return null;
}
