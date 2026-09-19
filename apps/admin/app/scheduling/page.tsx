"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import ScheduleDeconflictionConsole from "@/components/ScheduleDeconflictionConsole";

export default function SchedulingPage() {
  return (
    <AdminPageShell activeSection="scheduling">
      <ScheduleDeconflictionConsole />
    </AdminPageShell>
  );
}
