import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

async function getStoredConcerns(supabase: any): Promise<any[]> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "student_concerns")
      .maybeSingle();

    if (data && data.value && Array.isArray(data.value.concerns)) {
      return data.value.concerns;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveStoredConcerns(supabase: any, concerns: any[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "student_concerns",
        value: { concerns },
        updated_at: new Date().toISOString(),
      });
    return !error;
  } catch {
    return false;
  }
}

// GET: Student checks status by ticket or email
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const ticket = searchParams.get("ticket")?.trim().toUpperCase();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!ticket && !email) {
      return NextResponse.json(
        { error: "Ticket number or registered email is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const concerns = await getStoredConcerns(supabase);

    let matched: any[] = [];
    if (ticket) {
      matched = concerns.filter((c) => c.ticketNumber?.toUpperCase() === ticket);
    } else if (email) {
      matched = concerns.filter((c) => c.email?.toLowerCase() === email);
    }

    if (matched.length === 0) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          message: "No ticket found matching the provided reference.",
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Sort newest first
    matched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Public view only exposes relevant status fields for privacy
    const sanitized = matched.map((c) => ({
      ticketNumber: c.ticketNumber,
      category: c.category,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt,
      resolvedAt: c.resolvedAt,
      resolvedBy: c.resolvedBy,
      resolutionNotes: c.resolutionNotes,
      newTemporaryPassword: c.newTemporaryPassword,
    }));

    return NextResponse.json(
      {
        success: true,
        found: true,
        concern: sanitized[0],
        allConcerns: sanitized,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET student concerns error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve ticket status." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: Student submits a new concern
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { studentName, email, lrn, gradeLevel, contactNumber, category, subject, message } = body;

    const cleanName = String(studentName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanMessage = String(message || "").trim();

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return NextResponse.json(
        { error: "Please enter your full name, email address, and a description of your concern." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanLrn = lrn ? String(lrn).replace(/\D/g, "").slice(0, 12) : "";
    const cleanCategory = category || "other";

    const year = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${year}-${randomDigits}`;
    const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const cleanPriority = cleanCategory === "password_reset" || cleanCategory === "account_access" ? "high" : "medium";

    const defaultSubject =
      cleanCategory === "password_reset"
        ? "Password Reset Request"
        : cleanCategory === "account_access"
        ? "Account Access / Sign-In Issue"
        : cleanCategory === "lrn_discrepancy"
        ? "LRN / Personal Details Inquiry"
        : cleanCategory === "enrollment"
        ? "Enrollment / Subject Schedule Inquiry"
        : "Student Technical Concern";

    const newConcern = {
      id,
      ticketNumber,
      studentName: cleanName,
      email: cleanEmail,
      lrn: cleanLrn,
      gradeLevel: gradeLevel || "",
      contactNumber: contactNumber ? String(contactNumber).trim() : "",
      category: cleanCategory,
      subject: subject ? String(subject).trim() : defaultSubject,
      message: cleanMessage,
      status: "pending",
      priority: cleanPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNotes: null,
      newTemporaryPassword: null,
    };

    const concerns = await getStoredConcerns(supabase);
    concerns.unshift(newConcern);

    const saved = await saveStoredConcerns(supabase, concerns);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to submit concern. Please try again or contact IT Support." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your concern has been submitted to the IT Support Helpdesk.",
        ticketNumber,
        concern: {
          ticketNumber,
          category: cleanCategory,
          subject: newConcern.subject,
          status: "pending",
          createdAt: newConcern.createdAt,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST student concern error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit student concern." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
