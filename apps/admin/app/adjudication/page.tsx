"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import AdjudicationConsole from "@/components/AdjudicationConsole";

export default function AdjudicationPage() {
  return (
    <AdminPageShell activeSection="adjudication">
      <AdjudicationConsole />
    </AdminPageShell>
  );
}
