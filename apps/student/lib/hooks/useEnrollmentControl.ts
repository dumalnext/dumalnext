"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface EnrollmentControlSettings {
  isEnrollmentOpen: boolean;
  schoolYear: string;
  semester: string;
  termNumber?: number;
  activeTerm?: {
    schoolYear: string;
    termName: string;
    termNumber: number;
    startDate?: string | null;
    endDate?: string | null;
  };
  enrollmentStartDate?: string;
  enrollmentEndDate?: string;
  closedMessage: string;
  updatedAt?: string;
  updatedBy?: string;
}

const defaultSettings: EnrollmentControlSettings = {
  isEnrollmentOpen: true,
  schoolYear: "2026–2027",
  semester: "1st Semester",
  termNumber: 1,
  closedMessage:
    "DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year 2026–2027 is currently closed at this time. Please await further announcements from the Registrar's Office.",
};

export function useEnrollmentControl() {
  const [settings, setSettings] = useState<EnrollmentControlSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/enrollment-control?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          isEnrollmentOpen: typeof data.isEnrollmentOpen === "boolean" ? data.isEnrollmentOpen : true,
          schoolYear: data.schoolYear || "2026–2027",
          semester: data.semester || "1st Semester",
          termNumber: typeof data.termNumber === "number" ? data.termNumber : (data.activeTerm?.termNumber || 1),
          activeTerm: data.activeTerm || undefined,
          enrollmentStartDate: data.enrollmentStartDate,
          enrollmentEndDate: data.enrollmentEndDate,
          closedMessage:
            data.closedMessage ||
            "DepEd Official Advisory: Dumalneg National High School Online Enrollment is currently closed.",
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      }
    } catch (e) {
      console.warn("Notice: Fetching enrollment control settings failed, using defaults:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial immediate fetch
    fetchSettings();

    // 2. Supabase Realtime WebSocket Push (0-millisecond sync across any port/device)
    const supabase = createClient();
    const realtimeChannel = supabase
      .channel("enrollment-control-realtime")
      .on(
        "broadcast",
        { event: "enrollment-settings-updated" },
        (payload: any) => {
          const data = payload?.payload;
          if (data) {
            setSettings({
              isEnrollmentOpen: typeof data.isEnrollmentOpen === "boolean" ? data.isEnrollmentOpen : true,
              schoolYear: data.schoolYear || "2026–2027",
              semester: data.semester || "1st Semester",
              termNumber: typeof data.termNumber === "number" ? data.termNumber : (data.activeTerm?.termNumber || 1),
              activeTerm: data.activeTerm || undefined,
              enrollmentStartDate: data.enrollmentStartDate,
              enrollmentEndDate: data.enrollmentEndDate,
              closedMessage:
                data.closedMessage ||
                "DepEd Official Advisory: Dumalneg National High School Online Enrollment is currently closed.",
              updatedAt: data.updatedAt,
              updatedBy: data.updatedBy,
            });
            setIsLoading(false);
          }
        }
      )
      .subscribe();

    // 3. Browser BroadcastChannel for instant local cross-tab communication
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("dumalnext-enrollment-control");
        bc.onmessage = (event) => {
          const data = event?.data;
          if (data) {
            setSettings({
              isEnrollmentOpen: typeof data.isEnrollmentOpen === "boolean" ? data.isEnrollmentOpen : true,
              schoolYear: data.schoolYear || "2026–2027",
              semester: data.semester || "1st Semester",
              termNumber: typeof data.termNumber === "number" ? data.termNumber : (data.activeTerm?.termNumber || 1),
              activeTerm: data.activeTerm || undefined,
              enrollmentStartDate: data.enrollmentStartDate,
              enrollmentEndDate: data.enrollmentEndDate,
              closedMessage:
                data.closedMessage ||
                "DepEd Official Advisory: Dumalneg National High School Online Enrollment is currently closed.",
              updatedAt: data.updatedAt,
              updatedBy: data.updatedBy,
            });
            setIsLoading(false);
          }
        };
      } catch {}
    }

    // 4. Window focus & custom events listeners
    const onSync = () => fetchSettings();
    window.addEventListener("focus", onSync);
    window.addEventListener("dumalnext:data-changed", onSync);
    window.addEventListener("dumalnext:admin-data-changed", onSync);

    // 5. 2-Second Silent Fallback Polling (bypasses cache with timestamp)
    const interval = setInterval(fetchSettings, 2000);

    return () => {
      supabase.removeChannel(realtimeChannel);
      if (bc) bc.close();
      window.removeEventListener("focus", onSync);
      window.removeEventListener("dumalnext:data-changed", onSync);
      window.removeEventListener("dumalnext:admin-data-changed", onSync);
      clearInterval(interval);
    };
  }, [fetchSettings]);

  return {
    ...settings,
    settings,
    isLoading,
    refetch: fetchSettings,
  };
}
