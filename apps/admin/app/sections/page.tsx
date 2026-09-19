"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import SectionQuotaConsole from "@/components/SectionQuotaConsole";

export default function SectionsPage() {
  return (
    <AdminPageShell activeSection="sections">
      <SectionQuotaConsole />
    </AdminPageShell>
  );
}
