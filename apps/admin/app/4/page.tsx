"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Route4RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/control-room");
  }, [router]);

  return null;
}
