"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import CurriculumSubjectsConsole from "@/components/CurriculumSubjectsConsole";

export default function CurriculumPage() {
  return (
    <AdminPageShell activeSection="curriculum">
      <CurriculumSubjectsConsole />
    </AdminPageShell>
  );
}
