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

    return NextResponse.json({ success: true, terms: terms || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch terms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

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

    if (!schoolYear || !termNumber || !termName) {
      return NextResponse.json(
        { error: "School Year, Term Number (1-3), and Term Name are required." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      schoolYear,
      termNumber: Number(termNumber),
      termName,
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

    await supabase.from("academic_terms").update({ isActive: false }).neq("id", id);

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
