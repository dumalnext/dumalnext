"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SectionDetail {
  id: string;
  section_name: string;
  grade_level: number;
  strand?: string;
  room?: string;
  adviser_name?: string;
  capacity: number;
  enrolledCount: number;
}

export default function SectionQuotaConsole() {
  const supabase = createClient();

  const [sections, setSections] = useState<SectionDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  const fetchSections = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch all sections
      const { data: secData, error: secErr } = await supabase
        .from("sections")
        .select("*")
        .order("grade_level", { ascending: true })
        .order("section_name", { ascending: true });

      if (secErr) {
        console.warn("Error fetching sections:", secErr.message);
      }

      // 2. Fetch assigned sections count from enrollment_applications
      const { data: appData } = await supabase
        .from("enrollment_applications")
        .select("assigned_section, status")
        .eq("status", "Approved");

      const countMap = new Map<string, number>();
      if (appData) {
        appData.forEach((a: any) => {
          if (a.assigned_section) {
            countMap.set(
              a.assigned_section,
              (countMap.get(a.assigned_section) || 0) + 1
            );
          }
        });
      }

      const enriched: SectionDetail[] = (secData || []).map((s: any) => ({
        id: s.id,
        section_name: s.section_name,
        grade_level: s.grade_level,
        strand: s.strand || undefined,
        room: s.room || undefined,
        adviser_name: s.adviser_name || undefined,
        capacity: s.capacity || 40,
        enrolledCount: countMap.get(s.section_name) || s.enrolled_count || 0,
      }));

      setSections(enriched);
    } catch (err) {
      console.error("Failed to load sections:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();

    // Real-time channel for sections and approved applications
    const channel = supabase
      .channel("admin-sections-quota-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sections" },
        () => fetchSections()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollment_applications" },
        () => fetchSections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter sections by grade
  const filteredSections = sections.filter((sec) => {
    if (gradeFilter === "ALL") return true;
    return String(sec.grade_level) === String(gradeFilter);
  });

  const totalSections = filteredSections.length;
  const totalCapacity = filteredSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalEnrolled = filteredSections.reduce((sum, s) => sum + s.enrolledCount, 0);
  const totalAvailable = Math.max(0, totalCapacity - totalEnrolled);
  const overallPct = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Title & Real-Time Sync Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-slate-200 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#002060] uppercase tracking-wider block">
            [ MODULE 02: SECTION QUOTA &bull; CLASSROOM CAPACITY CONTROL ]
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tight mt-0.5">
            Class Sections &amp; Quota Limits Management
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Monitors classroom distribution to prevent oversubscription. Standard DepEd quota: 40 learners per section.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 border border-emerald-300 text-xs font-mono font-bold text-emerald-950">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase">Live Capacity Sync</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border-2 border-slate-300 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
            Total Sections
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
            {totalSections}
          </div>
          <span className="text-[10px] text-slate-500 block truncate">
            {gradeFilter === "ALL" ? "All Grades Combined" : `Grade ${gradeFilter} Only`}
          </span>
        </div>

        <div className="p-4 bg-blue-50/70 border-2 border-blue-300 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#002060] uppercase block">
            Total Capacity
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#002060] mt-1">
            {totalCapacity}
          </div>
          <span className="text-[10px] text-blue-900 block truncate">
            DepEd Standard Max Seats
          </span>
        </div>

        <div className="p-4 bg-emerald-50/70 border-2 border-emerald-500 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-emerald-950 uppercase block">
            Officially Enrolled
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-950 mt-1">
            {totalEnrolled}
          </div>
          <span className="text-[10px] text-emerald-900 block truncate">
            {overallPct}% Capacity Utilized
          </span>
        </div>

        <div className="p-4 bg-amber-50/70 border-2 border-amber-400 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-amber-950 uppercase block">
            Available Slots
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-950 mt-1">
            {totalAvailable}
          </div>
          <span className="text-[10px] text-amber-900 block truncate">
            Unfilled Seats Remaining
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border-2 border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 uppercase">
            Filter by Grade Level:
          </span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold text-[#002060] px-3 py-1.5 outline-none cursor-pointer"
          >
            <option value="ALL">All Grade Levels</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11 (SHS)</option>
            <option value="12">Grade 12 (SHS)</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing <strong>{filteredSections.length}</strong> section{filteredSections.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Sections Grid */}
      {isLoading ? (
        <div className="p-12 bg-white border-2 border-slate-300 text-center space-y-2">
          <span className="text-xs font-mono font-bold text-[#002060] uppercase block">
            [ LOADING SECTION QUOTA RECORDS ]
          </span>
          <p className="text-xs text-slate-500">Querying live section allocations from Supabase...</p>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="p-12 bg-white border-2 border-slate-300 text-center space-y-2">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase block">
            [ NO SECTIONS FOUND ]
          </span>
          <p className="text-xs text-slate-600">No sections exist for the selected grade filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((sec) => {
            const count = sec.enrolledCount || 0;
            const pct = Math.min(100, Math.round((count / sec.capacity) * 100));
            const isFull = count >= sec.capacity;

            return (
              <div key={sec.id} className="p-5 bg-white border-2 border-slate-300 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-sm font-bold uppercase text-[#002060] block">
                      {sec.section_name}
                    </span>
                    {sec.adviser_name && (
                      <span className="text-[11px] text-slate-600 block">
                        Adviser: {sec.adviser_name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 px-2.5 py-1 border border-slate-300 font-bold shrink-0">
                    Grade {sec.grade_level} {sec.strand ? `(${sec.strand})` : ""}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Enrolled Capacity:</span>
                    <strong className="font-mono text-slate-900">
                      {count} / {sec.capacity} students ({pct}%)
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 overflow-hidden border border-slate-300">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFull ? "bg-red-600" : pct > 75 ? "bg-amber-500" : "bg-[#002060]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Available Slots:</span>
                  <span
                    className={`font-bold font-mono px-2 py-0.5 border ${
                      isFull
                        ? "bg-red-50 text-red-700 border-red-300"
                        : "bg-emerald-50 text-emerald-900 border-emerald-300"
                    }`}
                  >
                    {isFull ? "FULL (0 SLOTS)" : `${sec.capacity - count} SLOTS REMAINING`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
