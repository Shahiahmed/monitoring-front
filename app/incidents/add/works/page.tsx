"use client";

import { Suspense } from "react";
import AddIncidentForm from "../add-incident-form";

export default function AddIncidentWorksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 px-6 py-10">
          <span className="text-sm text-gray-400">Загрузка…</span>
        </div>
      }
    >
      <AddIncidentForm mode="works" pathPrefix="/incidents/add/works" />
    </Suspense>
  );
}
