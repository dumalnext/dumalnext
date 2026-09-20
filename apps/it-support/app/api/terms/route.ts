import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: terms, error } = await supabase
      .from("academic_terms")
      .select("*")
      .order("schoolYear", { ascending: false })
      .order("termNumber", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentTerms = terms || [];

    // Auto-ensure terms 1, 2, 3 exist for every existing school year
    const schoolYears = Array.from(new Set(currentTerms.map((t) => t.schoolYear)));
    const missingToCreate: any[] = [];

    for (const sy of schoolYears) {
      for (const num of [1, 2, 3]) {
        const exists = currentTerms.some((t) => t.schoolYear === sy && t.termNumber === num);
        if (!exists) {
          missingToCreate.push({
            schoolYear: sy,
            termNumber: num,
            termName: `Trimester ${num}`,
            isActive: false,
          });
        }
      }
    }

    if (missingToCreate.length > 0) {
      await supabase.from("academic_terms").upsert(missingToCreate, { onConflict: "schoolYear,termNumber" });
      const { data: refreshed } = await supabase
        .from("academic_terms")
        .select("*")
        .order("schoolYear", { ascending: false })
        .order("termNumber", { ascending: true });
      return NextResponse.json({ success: true, terms: refreshed || [] });
    }

    return NextResponse.json({ success: true, terms: currentTerms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch terms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // ACTION: Create new School Year with 3 unconfigured Trimesters (1, 2, 3)
    if (body.action === "create_school_year" || (body.schoolYear && !body.termNumber)) {
      const cleanSY = String(body.schoolYear).trim();
      if (!cleanSY) {
        return NextResponse.json({ error: "Please enter a valid School Year (e.g. 2027-2028)." }, { status: 400 });
      }

      const termsToCreate = [1, 2, 3].map((num) => ({
        schoolYear: cleanSY,
        termNumber: num,
        termName: `Trimester ${num}`,
        totalClassDays: null,
        startDate: null,
        endDate: null,
        openingBlockStart: null,
        openingBlockEnd: null,
        instructionalStart: null,
        instructionalEnd: null,
        endOfTermStart: null,
        endOfTermEnd: null,
        summative1Date: null,
        summative2Date: null,
        termExamDates: null,
        reportCardDate: null,
        isActive: false,
      }));

      const { data, error } = await supabase
        .from("academic_terms")
        .upsert(termsToCreate, { onConflict: "schoolYear,termNumber" })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, schoolYear: cleanSY, terms: data });
    }

    // ACTION: Update an existing Trimester's dates
    const {
      id,
      schoolYear,
      termNumber,
      termName,
      totalClassDays,
      startDate,
      endDate,
      openingBlockStart,
      openingBlockEnd,
      instructionalStart,
      instructionalEnd,
      endOfTermStart,
      endOfTermEnd,
      summative1Date,
      summative2Date,
      termExamDates,
      reportCardDate,
      isActive,
    } = body;

    if (!schoolYear || !termNumber) {
      return NextResponse.json(
        { error: "School Year and Trimester Number are required." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      schoolYear,
      termNumber: Number(termNumber),
      termName: termName || `Trimester ${termNumber}`,
      totalClassDays: totalClassDays ? Number(totalClassDays) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      openingBlockStart: openingBlockStart || null,
      openingBlockEnd: openingBlockEnd || null,
      instructionalStart: instructionalStart || null,
      instructionalEnd: instructionalEnd || null,
      endOfTermStart: endOfTermStart || null,
      endOfTermEnd: endOfTermEnd || null,
      summative1Date: summative1Date || null,
      summative2Date: summative2Date || null,
      termExamDates: termExamDates || null,
      reportCardDate: reportCardDate || null,
      isActive: Boolean(isActive),
    };

    if (id) {
      payload.id = id;
    }

    if (payload.isActive) {
      await supabase
        .from("academic_terms")
        .update({ isActive: false })
        .neq("id", id || "00000000-0000-0000-0000-000000000000");
    }

    const { data, error } = await supabase
      .from("academic_terms")
      .upsert(payload, { onConflict: "schoolYear,termNumber" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, term: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save academic term" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Term ID is required." }, { status: 400 });
    }

    // Deactivate all terms first
    await supabase.from("academic_terms").update({ isActive: false }).neq("id", id);

    // Activate the selected term
    const { data, error } = await supabase
      .from("academic_terms")
      .update({ isActive: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activeTerm: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to activate term" }, { status: 500 });
  }
}
