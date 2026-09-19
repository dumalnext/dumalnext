"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminPageShell from "@/components/AdminPageShell";
import AdjudicationConsole from "@/components/AdjudicationConsole";
import { useAdminAuth } from "@/lib/auth/authContext";

export default function AdminRootPage() {
  const router = useRouter();
  const { user, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/adjudication");
    }
  }, [user, isLoading, router]);

  return (
    <AdminPageShell activeSection="adjudication">
      <AdjudicationConsole />
    </AdminPageShell>
  );
}
