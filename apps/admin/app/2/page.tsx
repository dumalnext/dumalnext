"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Route2RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sections");
  }, [router]);

  return null;
}
