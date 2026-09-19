"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Route3RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/scheduling");
  }, [router]);

  return null;
}
