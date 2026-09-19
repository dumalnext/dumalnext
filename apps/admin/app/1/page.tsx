"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Route1RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/adjudication");
  }, [router]);

  return null;
}
