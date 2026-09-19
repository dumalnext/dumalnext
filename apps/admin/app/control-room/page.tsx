"use client";

import React from "react";
import AdminPageShell from "@/components/AdminPageShell";
import EnrollmentControlRoom from "@/components/EnrollmentControlRoom";

export default function ControlRoomPage() {
  return (
    <AdminPageShell activeSection="control">
      <EnrollmentControlRoom />
    </AdminPageShell>
  );
}
