"use client";

import { useState, useEffect, useCallback } from "react";

export interface EnrollmentControlSettings {
  isEnrollmentOpen: boolean;
  schoolYear: string;
  semester: string;
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
  closedMessage:
    "DepEd Official Advisory: Dumalneg National High School Online Enrollment for School Year 2026–2027 is currently closed at this time. Please await further announcements from the Registrar's Office.",
};

export function useEnrollmentControl() {
  const [settings, setSettings] = useState<EnrollmentControlSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/enrollment-control", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          isEnrollmentOpen: typeof data.isEnrollmentOpen === "boolean" ? data.isEnrollmentOpen : true,
          schoolYear: data.schoolYear || "2026–2027",
          semester: data.semester || "1st Semester",
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
    fetchSettings();

    const onFocus = () => fetchSettings();
    window.addEventListener("focus", onFocus);
    window.addEventListener("dumalnext:data-changed", onFocus);

    // 6-second polling to ensure instant sync when admin changes settings
    const interval = setInterval(fetchSettings, 6000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dumalnext:data-changed", onFocus);
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
