"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import CurriculumSubjectsConsole from "@/components/CurriculumSubjectsConsole";

export default function SubjectsPage() {
  return (
    <AdminPageShell activeSection="subjects">
      <CurriculumSubjectsConsole />
    </AdminPageShell>
  );
}
