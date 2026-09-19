import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

interface SectionPayload {
  id?: string;
  section_name: string;
  grade_level: number;
  strand?: string | null;
  room?: string | null;
  adviser_name?: string | null;
  capacity: number;
  school_year?: string;
}

// GET /api/sections - List sections with live enrolled counts (and optionally students)
export async function GET(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const includeStudents = searchParams.get("includeStudents") === "true";

    // 1. Fetch sections from table
    const { data: dbSections, error: secErr } = await supabase
      .from("sections")
      .select("*")
      .order("grade_level", { ascending: true })
      .order("section_name", { ascending: true });

    if (secErr) {
      console.warn("Notice reading sections table:", secErr.message);
    }

    // 2. Fetch custom section overrides / additions from system_settings
    let customSections: SectionPayload[] = [];
    let deletedSectionIds: string[] = [];
    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sections_config")
        .maybeSingle();

      if (sysData?.value) {
        customSections = sysData.value.customSections || [];
        deletedSectionIds = sysData.value.deletedIds || [];
      }
    } catch {}

    // Merge: Base DB sections (minus deleted) + custom added sections + capacity overrides
    const sectionMap = new Map<string, any>();
    (dbSections || []).forEach((s: any) => {
      if (!deletedSectionIds.includes(s.id)) {
        sectionMap.set(s.id, { ...s });
      }
    });

    customSections.forEach((cs) => {
      if (cs.id && !deletedSectionIds.includes(cs.id)) {
        const existing = sectionMap.get(cs.id);
        if (existing) {
          sectionMap.set(cs.id, { ...existing, ...cs });
        } else {
          sectionMap.set(cs.id, cs);
        }
      }
    });

    // 3. Fetch enrolled students count
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, first_name, middle_name, last_name, gender, grade_level, strand, current_section_id, contact_number, barangay")
      .not("current_section_id", "is", null);

    const countMap = new Map<string, number>();
    const studentListMap = new Map<string, any[]>();

    if (studentsData) {
      studentsData.forEach((st: any) => {
        if (st.current_section_id) {
          countMap.set(
            st.current_section_id,
            (countMap.get(st.current_section_id) || 0) + 1
          );

          if (!studentListMap.has(st.current_section_id)) {
            studentListMap.set(st.current_section_id, []);
          }
          studentListMap.get(st.current_section_id)?.push(st);
        }
      });
    }

    const sectionsList = Array.from(sectionMap.values()).map((s) => ({
      id: s.id,
      section_name: s.section_name,
      grade_level: Number(s.grade_level),
      strand: s.strand || undefined,
      room: s.room || undefined,
      adviser_name: s.adviser_name || undefined,
      capacity: Number(s.capacity) || 40,
      school_year: s.school_year || "2026-2027",
      enrolledCount: countMap.get(s.id) || 0,
      students: includeStudents ? (studentListMap.get(s.id) || []) : undefined,
    }));

    // Sort by grade level and section name
    sectionsList.sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      return a.section_name.localeCompare(b.section_name);
    });

    if (sectionId) {
      const single = sectionsList.find((s) => s.id === sectionId);
      if (!single) {
        return NextResponse.json({ success: false, error: "Section not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({
        success: true,
        section: {
          ...single,
          students: studentListMap.get(sectionId) || [],
        },
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, sections: sectionsList }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("Error in GET /api/sections:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch sections" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// POST /api/sections - Create a new section
export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { section_name, grade_level, strand, room, adviser_name, capacity, school_year } = body;

    if (!section_name || !section_name.trim()) {
      return NextResponse.json({ success: false, error: "Section name is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (!grade_level || isNaN(Number(grade_level))) {
      return NextResponse.json({ success: false, error: "Valid grade level (7–12) is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const parsedCapacity = Number(capacity) > 0 ? Number(capacity) : 40;
    const cleanSchoolYear = (school_year || "2026-2027").replace("–", "-");
    const newId = crypto.randomUUID();

    const newSection: SectionPayload = {
      id: newId,
      section_name: section_name.trim(),
      grade_level: Number(grade_level),
      strand: strand ? strand.trim() : null,
      room: room ? room.trim() : null,
      adviser_name: adviser_name ? adviser_name.trim() : null,
      capacity: parsedCapacity,
      school_year: cleanSchoolYear,
    };

    // 1. Try DB insert
    let dbSuccess = false;
    try {
      const { data, error } = await supabase.from("sections").insert(newSection).select().single();
      if (!error && data) {
        dbSuccess = true;
      }
    } catch {}

    // 2. Always persist into system_settings config as guaranteed backup
    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sections_config")
        .maybeSingle();

      const existingConfig = sysData?.value || { customSections: [], deletedIds: [] };
      const updatedCustom = [...(existingConfig.customSections || []), newSection];

      await supabase.from("system_settings").upsert({
        key: "sections_config",
        value: {
          ...existingConfig,
          customSections: updatedCustom,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (sysErr) {
      console.warn("Notice updating sections_config:", sysErr);
    }

    return NextResponse.json({
      success: true,
      section: {
        ...newSection,
        enrolledCount: 0,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("Error in POST /api/sections:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to create section" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// PUT /api/sections - Update section details (Name, Capacity, Adviser, Room, etc.)
export async function PUT(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { id, section_name, grade_level, strand, room, adviser_name, capacity } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required for update." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updatePayload: Partial<SectionPayload> = {};
    if (section_name !== undefined) updatePayload.section_name = section_name.trim();
    if (grade_level !== undefined) updatePayload.grade_level = Number(grade_level);
    if (strand !== undefined) updatePayload.strand = strand ? strand.trim() : null;
    if (room !== undefined) updatePayload.room = room ? room.trim() : null;
    if (adviser_name !== undefined) updatePayload.adviser_name = adviser_name ? adviser_name.trim() : null;
    if (capacity !== undefined) updatePayload.capacity = Number(capacity) > 0 ? Number(capacity) : 40;

    // 1. Try DB update
    try {
      await supabase.from("sections").update(updatePayload).eq("id", id);
    } catch {}

    // 2. Always persist into system_settings config
    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sections_config")
        .maybeSingle();

      const existingConfig = sysData?.value || { customSections: [], deletedIds: [] };
      const currentCustom: SectionPayload[] = existingConfig.customSections || [];

      const index = currentCustom.findIndex((s) => s.id === id);
      if (index >= 0) {
        currentCustom[index] = { ...currentCustom[index], ...updatePayload };
      } else {
        currentCustom.push({ id, ...updatePayload } as SectionPayload);
      }

      await supabase.from("system_settings").upsert({
        key: "sections_config",
        value: {
          ...existingConfig,
          customSections: currentCustom,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (sysErr) {
      console.warn("Notice updating sections_config:", sysErr);
    }

    return NextResponse.json({ success: true, updated: updatePayload }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("Error in PUT /api/sections:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to update section" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

// DELETE /api/sections - Remove a section (with guard against deleting populated sections)
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Check if any student is enrolled in this section
    const { data: enrolledStudents } = await supabase
      .from("students")
      .select("id")
      .eq("current_section_id", id);

    if (enrolledStudents && enrolledStudents.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete this section: There are currently ${enrolledStudents.length} student(s) enrolled in it. Please reassign the students to another section first.`,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Try DB delete
    try {
      await supabase.from("sections").delete().eq("id", id);
    } catch {}

    // 2. Persist deleted ID in system_settings
    try {
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "sections_config")
        .maybeSingle();

      const existingConfig = sysData?.value || { customSections: [], deletedIds: [] };
      const currentCustom: SectionPayload[] = (existingConfig.customSections || []).filter(
        (s: SectionPayload) => s.id !== id
      );
      const deletedIds: string[] = Array.from(
        new Set([...(existingConfig.deletedIds || []), id])
      );

      await supabase.from("system_settings").upsert({
        key: "sections_config",
        value: {
          customSections: currentCustom,
          deletedIds,
          updatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch (sysErr) {
      console.warn("Notice updating sections_config on delete:", sysErr);
    }

    return NextResponse.json({ success: true, deletedId: id }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("Error in DELETE /api/sections:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to delete section" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
