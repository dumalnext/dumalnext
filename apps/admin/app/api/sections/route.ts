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

// Helpers for dynamic multi-semester term tracking
function extractTermNumber(termStr?: string | null): number {
  if (!termStr) return 0;
  const lower = String(termStr).toLowerCase();
  if (lower.includes("1") || lower.includes("first")) return 1;
  if (lower.includes("2") || lower.includes("second")) return 2;
  if (lower.includes("3") || lower.includes("third")) return 3;
  return 0;
}

function getApplicationTermNumber(app: any): number {
  const fd = app.selected_electives?.[0] || {};
  const rawTerm = (
    fd.term_name ||
    fd.termName ||
    fd.semester ||
    fd.term ||
    fd.targetSemester ||
    app.term_name ||
    app.semester ||
    ""
  );
  const num = extractTermNumber(rawTerm);
  return num !== 0 ? num : 1;
}

function isApplicationInActiveTerm(
  app: any,
  activeSchoolYear: string,
  activeTermNumber: number
): boolean {
  const cleanAppSY = (app.school_year || "").replace("–", "-").trim();
  const cleanActiveSY = (activeSchoolYear || "").replace("–", "-").trim();

  if (cleanActiveSY && cleanAppSY && cleanActiveSY !== cleanAppSY) {
    return false;
  }

  const appTermNum = getApplicationTermNumber(app);
  return appTermNum === activeTermNumber;
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

    // 0. Fetch active academic term configured by IT Support
    const { data: termsData } = await supabase
      .from("academic_terms")
      .select("schoolYear, termNumber, termName, isActive")
      .order("schoolYear", { ascending: false });

    const activeTerm = (termsData || []).find((t: any) => t.isActive);
    const activeSchoolYear = (activeTerm?.schoolYear || "2026-2027").replace("–", "-").trim();
    const activeTermNumber = Number(activeTerm?.termNumber) || 1;
    const activeTermName = activeTerm?.termName || `Trimester ${activeTermNumber}`;

    // 1. Fetch approved enrollment applications for active term tracking
    const { data: appsData } = await supabase
      .from("enrollment_applications")
      .select("id, student_id, school_year, status, selected_electives, target_grade_level, target_strand");

    const enrolledInActiveTermSet = new Set<string>();
    (appsData || []).forEach((app: any) => {
      if (app.status === "Approved" && app.student_id) {
        if (isApplicationInActiveTerm(app, activeSchoolYear, activeTermNumber)) {
          enrolledInActiveTermSet.add(app.student_id);
        }
      }
    });

    // 2. Fetch sections from table
    const { data: dbSections, error: secErr } = await supabase
      .from("sections")
      .select("*")
      .order("grade_level", { ascending: true })
      .order("section_name", { ascending: true });

    if (secErr) {
      console.warn("Notice reading sections table:", secErr.message);
    }

    // 3. Fetch custom section overrides / additions from system_settings
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

    // 4. Fetch enrolled students
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_id, first_name, middle_name, last_name, gender, grade_level, strand, current_section_id, contact_number, barangay");

    const countMap = new Map<string, number>();
    const studentListMap = new Map<string, any[]>();
    const studentByIdMap = new Map<string, any>();

    if (studentsData) {
      studentsData.forEach((st: any) => {
        studentByIdMap.set(st.id, st);
        if (st.current_section_id) {
          const isEnrolledInActiveTerm = enrolledInActiveTermSet.has(st.id);
          const studentWithStatus = {
            ...st,
            isEnrolledInActiveTerm,
          };

          if (isEnrolledInActiveTerm) {
            countMap.set(
              st.current_section_id,
              (countMap.get(st.current_section_id) || 0) + 1
            );
          }

          if (!studentListMap.has(st.current_section_id)) {
            studentListMap.set(st.current_section_id, []);
          }
          studentListMap.get(st.current_section_id)?.push(studentWithStatus);
        }
      });
    }

    // Query classrooms to ensure section capacity is synced with IT Support physical room capacity
    const { data: classroomsData } = await supabase
      .from("classrooms")
      .select("classroom_id, room_name, building, capacity");

    const roomCapacityMap = new Map<string, number>();
    (classroomsData || []).forEach((c: any) => {
      const cap = Number(c.capacity) || 40;
      if (c.classroom_id) roomCapacityMap.set(c.classroom_id.toLowerCase(), cap);
      if (c.room_name) roomCapacityMap.set(c.room_name.toLowerCase(), cap);
      if (c.room_name && c.building) {
        roomCapacityMap.set(`${c.room_name} (${c.building})`.toLowerCase(), cap);
      }
    });

    const sectionsList = Array.from(sectionMap.values())
      .filter((s) => s.strand !== "Elective" && !s.isElective && !String(s.id).startsWith("elec-"))
      .map((s) => {
      let capacity = Number(s.capacity) || 40;
      if (s.room) {
        const cleanRoom = s.room.trim().toLowerCase();
        for (const [key, cap] of roomCapacityMap.entries()) {
          if (cleanRoom === key || cleanRoom.includes(key) || key.includes(cleanRoom)) {
            capacity = cap;
            break;
          }
        }
      }
      return {
        id: s.id,
        section_name: s.section_name,
        grade_level: Number(s.grade_level),
        strand: s.strand || undefined,
        room: s.room || undefined,
        adviser_name: s.adviser_name || undefined,
        capacity,
        school_year: s.school_year || activeSchoolYear,
        enrolledCount: countMap.get(s.id) || 0,
        totalRosterCount: (studentListMap.get(s.id) || []).length,
        students: includeStudents ? (studentListMap.get(s.id) || []) : undefined,
      };
    });

    // Sort by grade level and section name
    sectionsList.sort((a, b) => {
      if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
      return a.section_name.localeCompare(b.section_name);
    });

    // 5. Build SHS Elective Sections dynamically from the Subjects Management part
    // Strict rule: Only the exact elective/specialized subjects configured by Admin in the Subject part will generate elective sections.
    let configuredSubjects: any[] = [];
    let deletedSubjectCodes: string[] = [];

    try {
      const { data: sysSubjData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "subjects_config")
        .maybeSingle();

      if (sysSubjData?.value) {
        if (Array.isArray(sysSubjData.value.subjects) && sysSubjData.value.subjects.length > 0) {
          configuredSubjects = sysSubjData.value.subjects;
        }
        if (Array.isArray(sysSubjData.value.deletedCodes)) {
          deletedSubjectCodes = sysSubjData.value.deletedCodes;
        }
      }
    } catch (err) {
      console.warn("Notice reading subjects_config for sections:", err);
    }

    if (configuredSubjects.length === 0) {
      // Fallback to course_subjects table if system_settings subjects array is empty
      const { data: dbCourseSubjects } = await supabase
        .from("course_subjects")
        .select("*");
      if (dbCourseSubjects && dbCourseSubjects.length > 0) {
        configuredSubjects = dbCourseSubjects;
      }
    }

    // Filter for active SHS Elective / Specialized / Applied subjects
    const deletedCodeSet = new Set(deletedSubjectCodes.map((c) => c.toUpperCase()));
    const activeElectiveSubjects: { code: string; name: string; grade_level: number }[] = [];
    const seenElectiveKeys = new Set<string>();

    configuredSubjects.forEach((s: any) => {
      const code = (s.subject_code || s.subjectCode || "").trim().toUpperCase();
      const name = (s.subject_name || s.subjectName || "").trim();
      const gLevel = Number(s.grade_level || s.gradeLevel);
      const type = (s.subject_type || s.subjectType || "Core").toUpperCase();

      if (deletedCodeSet.has(code)) return;
      if (gLevel < 11 || gLevel > 12) return;
      if (type === "CORE") return; // Only non-core subjects (Elective, Specialized, Applied) count as electives

      const dedupeKey = `${gLevel}-${code}`;
      if (!seenElectiveKeys.has(dedupeKey)) {
        seenElectiveKeys.add(dedupeKey);
        activeElectiveSubjects.push({
          code,
          name,
          grade_level: gLevel,
        });
      }
    });

    // Map of electiveKey -> Array of students taking that elective
    const electiveStudentMap = new Map<string, any[]>();

    (appsData || []).forEach((app: any) => {
      const gLevel = Number(app.target_grade_level);
      if (gLevel >= 11 && app.student_id) {
        const studentObj = studentByIdMap.get(app.student_id);
        if (!studentObj) return;

        const baseSection = studentObj.current_section_id ? sectionMap.get(studentObj.current_section_id) : null;
        const baseSectionName = baseSection ? baseSection.section_name : "Not Yet Assigned";

        const fd = Array.isArray(app.selected_electives) && app.selected_electives.length > 0
          ? app.selected_electives[0]
          : typeof app.selected_electives === "object" && app.selected_electives !== null
          ? app.selected_electives
          : {};

        let rawElectives: string[] = [];
        if (Array.isArray(fd.selectedElectives) && fd.selectedElectives.length > 0) {
          rawElectives = fd.selectedElectives;
        } else if (Array.isArray(app.selected_electives) && app.selected_electives.length > 0) {
          const first = app.selected_electives[0];
          if (typeof first === "string") rawElectives = app.selected_electives;
          else if (first && Array.isArray(first.selectedElectives)) rawElectives = first.selectedElectives;
        }
        if (fd.elective) rawElectives.push(fd.elective);
        if (fd.firstElective) rawElectives.push(fd.firstElective);
        if (fd.secondElective) rawElectives.push(fd.secondElective);
        if (fd.electiveSubject) rawElectives.push(fd.electiveSubject);

        const enrichedStudentItem = {
          ...studentObj,
          base_section_id: studentObj.current_section_id,
          base_section_name: baseSectionName,
          isEnrolledInActiveTerm: enrolledInActiveTermSet.has(studentObj.id),
        };

        // Match student's selected electives against activeElectiveSubjects for their grade level
        activeElectiveSubjects.forEach((elecSubj) => {
          if (elecSubj.grade_level !== gLevel) return;

          const codeUpper = elecSubj.code.toUpperCase();
          const nameUpper = elecSubj.name.toUpperCase();

          const isMatch = rawElectives.some((re) => {
            if (!re || typeof re !== "string") return false;
            const clean = re.trim().toUpperCase();
            return (
              clean === codeUpper ||
              clean === nameUpper ||
              nameUpper.includes(clean) ||
              clean.includes(nameUpper) ||
              (clean.length > 3 && codeUpper.includes(clean))
            );
          });

          if (isMatch) {
            const key = `${elecSubj.grade_level}-${elecSubj.code}`;
            if (!electiveStudentMap.has(key)) {
              electiveStudentMap.set(key, []);
            }
            const list = electiveStudentMap.get(key)!;
            if (!list.some((s) => s.id === enrichedStudentItem.id)) {
              list.push(enrichedStudentItem);
            }
          }
        });
      }
    });

    // Build the elective sections list strictly for active elective subjects
    const electiveSectionsList: any[] = [];

    activeElectiveSubjects.forEach((cat) => {
      const key = `${cat.grade_level}-${cat.code}`;
      const enrolledStudents = electiveStudentMap.get(key) || [];
      const customConfig = customSections.find(
        (cs) =>
          cs.id === `elec-${cat.grade_level}-${cat.code}` ||
          (cs.strand === "Elective" &&
            cs.grade_level === cat.grade_level &&
            cs.section_name.toLowerCase().includes(cat.name.toLowerCase()))
      );

      let capacity = customConfig?.capacity || 40;
      let room = customConfig?.room || undefined;
      let adviser_name = customConfig?.adviser_name || undefined;

      if (room) {
        const cleanRoom = room.trim().toLowerCase();
        for (const [k, cap] of roomCapacityMap.entries()) {
          if (cleanRoom === k || cleanRoom.includes(k) || k.includes(cleanRoom)) {
            capacity = cap;
            break;
          }
        }
      }

      electiveSectionsList.push({
        id: customConfig?.id || `elec-${cat.grade_level}-${cat.code}`,
        section_name: customConfig?.section_name || `Grade ${cat.grade_level} Elective - ${cat.name}`,
        grade_level: cat.grade_level,
        strand: "Elective",
        isElective: true,
        electiveCode: cat.code,
        electiveName: cat.name,
        room,
        adviser_name,
        capacity,
        school_year: customConfig?.school_year || activeSchoolYear,
        enrolledCount: enrolledStudents.length,
        totalRosterCount: enrolledStudents.length,
        students: enrolledStudents,
      });
    });

    if (sectionId) {
      const single =
        sectionsList.find((s) => s.id === sectionId) ||
        electiveSectionsList.find((s) => s.id === sectionId);

      if (!single) {
        return NextResponse.json({ success: false, error: "Section not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({
        success: true,
        activeTerm: {
          schoolYear: activeSchoolYear,
          termNumber: activeTermNumber,
          termName: activeTermName,
        },
        section: {
          ...single,
          students: single.isElective ? (single.students || []) : (studentListMap.get(sectionId) || []),
        },
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      success: true,
      activeTerm: {
        schoolYear: activeSchoolYear,
        termNumber: activeTermNumber,
        termName: activeTermName,
      },
      sections: sectionsList,
      electiveSections: electiveSectionsList,
    }, { headers: NO_CACHE_HEADERS });
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

    let parsedCapacity = Number(capacity) > 0 ? Number(capacity) : 40;
    if (room) {
      const { data: rmData } = await supabase
        .from("classrooms")
        .select("classroom_id, room_name, building, capacity");
      if (rmData) {
        const cleanRoom = room.trim().toLowerCase();
        const found = rmData.find((c: any) => {
          const full = `${c.room_name} (${c.building})`.toLowerCase();
          return full === cleanRoom || c.room_name?.toLowerCase() === cleanRoom || c.classroom_id?.toLowerCase() === cleanRoom;
        });
        if (found && found.capacity) {
          parsedCapacity = Number(found.capacity);
        }
      }
    }
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

    // Check for student removal request from section roster
    if (body.removeStudentId || (body.action === "remove_student" && body.studentId)) {
      const studentIdToRemove = body.removeStudentId || body.studentId;
      const { error: remErr } = await supabase
        .from("students")
        .update({
          current_section_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentIdToRemove);

      if (remErr) {
        return NextResponse.json({ success: false, error: remErr.message }, { status: 500, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, removedStudentId: studentIdToRemove }, { headers: NO_CACHE_HEADERS });
    }

    // Check for student reassignment request
    if (body.reassignStudentId && body.targetSectionId) {
      const { error: reassignErr } = await supabase
        .from("students")
        .update({
          current_section_id: body.targetSectionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.reassignStudentId);

      if (reassignErr) {
        return NextResponse.json({ success: false, error: reassignErr.message }, { status: 500, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ success: true, reassignedStudentId: body.reassignStudentId, targetSectionId: body.targetSectionId }, { headers: NO_CACHE_HEADERS });
    }

    const { id, section_name, grade_level, strand, room, adviser_name, capacity } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required for update." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updatePayload: Partial<SectionPayload> = {};
    if (section_name !== undefined) updatePayload.section_name = section_name.trim();
    if (grade_level !== undefined) updatePayload.grade_level = Number(grade_level);
    if (strand !== undefined) updatePayload.strand = strand ? strand.trim() : null;
    if (adviser_name !== undefined) updatePayload.adviser_name = adviser_name ? adviser_name.trim() : null;
    if (capacity !== undefined) updatePayload.capacity = Number(capacity) > 0 ? Number(capacity) : 40;
    if (room !== undefined) {
      updatePayload.room = room ? room.trim() : null;
      if (room) {
        const { data: rmData } = await supabase
          .from("classrooms")
          .select("classroom_id, room_name, building, capacity");
        if (rmData) {
          const cleanRoom = room.trim().toLowerCase();
          const found = rmData.find((c: any) => {
            const full = `${c.room_name} (${c.building})`.toLowerCase();
            return full === cleanRoom || c.room_name?.toLowerCase() === cleanRoom || c.classroom_id?.toLowerCase() === cleanRoom;
          });
          if (found && found.capacity) {
            updatePayload.capacity = Number(found.capacity);
          }
        }
      }
    }

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
