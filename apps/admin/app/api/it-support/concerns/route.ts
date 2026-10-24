import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { sendEmailReplyToStudent, sendReceiptToStudent } from "@/lib/emailDispatcher";

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

export type ConcernCategory =
  | "password_reset"
  | "account_access"
  | "lrn_discrepancy"
  | "enrollment"
  | "technical"
  | "other";

export type ConcernStatus = "pending" | "in_progress" | "resolved" | "rejected";
export type ConcernPriority = "low" | "medium" | "high" | "urgent";

export interface StudentConcern {
  id: string;
  ticketNumber: string;
  studentName: string;
  email: string;
  lrn: string;
  gradeLevel?: string | number;
  contactNumber?: string;
  category: ConcernCategory;
  subject: string;
  message: string;
  status: ConcernStatus;
  priority: ConcernPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  newTemporaryPassword?: string | null;
  replies?: Array<{
    id: string;
    sender: "it_support" | "student";
    senderName: string;
    message: string;
    createdAt: string;
  }>;
}

async function getStoredConcerns(supabase: any): Promise<StudentConcern[]> {
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

async function saveStoredConcerns(supabase: any, concerns: StudentConcern[]): Promise<boolean> {
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

// GET: Retrieve concerns with optional filtering
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
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const query = searchParams.get("query")?.toLowerCase().trim();
    const ticket = searchParams.get("ticket")?.toUpperCase().trim();

    const concerns = await getStoredConcerns(supabase);

    let filtered = [...concerns];

    if (ticket) {
      filtered = filtered.filter((c) => c.ticketNumber.toUpperCase() === ticket);
    }

    if (category && category !== "all") {
      filtered = filtered.filter((c) => c.category === category);
    }

    if (status && status !== "all") {
      filtered = filtered.filter((c) => c.status === status);
    }

    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.studentName.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.lrn.includes(query) ||
          c.ticketNumber.toLowerCase().includes(query) ||
          c.subject.toLowerCase().includes(query)
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const counts = {
      total: concerns.length,
      pending: concerns.filter((c) => c.status === "pending").length,
      inProgress: concerns.filter((c) => c.status === "in_progress").length,
      resolved: concerns.filter((c) => c.status === "resolved").length,
      passwordReset: concerns.filter((c) => c.category === "password_reset" && c.status !== "resolved").length,
    };

    return NextResponse.json(
      {
        success: true,
        concerns: filtered,
        counts,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET concerns error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve student concerns." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST: Create a concern (used by IT Support manual entry or API)
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
    const { studentName, email, lrn, gradeLevel, contactNumber, category, subject, message, priority } = body;

    if (!studentName || !email || !message) {
      return NextResponse.json(
        { error: "Student name, email, and description message are required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const concerns = await getStoredConcerns(supabase);

    const year = new Date().getFullYear();
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${year}-${randomHex}`;
    const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const cleanCategory: ConcernCategory = (category as ConcernCategory) || "other";
    const defaultPriority: ConcernPriority = cleanCategory === "password_reset" ? "high" : (priority as ConcernPriority) || "medium";

    const newConcern: StudentConcern = {
      id,
      ticketNumber,
      studentName: String(studentName).trim(),
      email: String(email).toLowerCase().trim(),
      lrn: lrn ? String(lrn).replace(/\D/g, "").slice(0, 12) : "",
      gradeLevel: gradeLevel || "",
      contactNumber: contactNumber ? String(contactNumber).trim() : "",
      category: cleanCategory,
      subject: subject ? String(subject).trim() : (cleanCategory === "password_reset" ? "Password Reset Request" : "Student Technical Concern"),
      message: String(message).trim(),
      status: "pending",
      priority: defaultPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNotes: null,
      newTemporaryPassword: null,
    };

    concerns.unshift(newConcern);
    const saved = await saveStoredConcerns(supabase, concerns);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to persist concern in database." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Concern submitted successfully.",
        ticketNumber,
        concern: newConcern,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST concern error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit concern." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PATCH: Update status, resolution notes, priority
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const { id, status, resolutionNotes, resolvedBy, priority, replyMessage, senderName } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Concern ID is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const concerns = await getStoredConcerns(supabase);
    const index = concerns.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Concern record not found." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const current = concerns[index];
    const newStatus = (status as ConcernStatus) || current.status;
    const isResolved = newStatus === "resolved" && current.status !== "resolved";

    const existingReplies = Array.isArray(current.replies) ? current.replies : [];
    let updatedReplies = [...existingReplies];
    if (replyMessage && String(replyMessage).trim()) {
      updatedReplies.push({
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: "it_support",
        senderName: resolvedBy || senderName || "IT Support Officer",
        message: String(replyMessage).trim(),
        createdAt: new Date().toISOString(),
      });
    }

    concerns[index] = {
      ...current,
      status: newStatus,
      priority: (priority as ConcernPriority) || current.priority,
      resolutionNotes: resolutionNotes !== undefined ? String(resolutionNotes).trim() : current.resolutionNotes,
      resolvedBy: resolvedBy || current.resolvedBy,
      resolvedAt: isResolved ? new Date().toISOString() : (newStatus !== "resolved" ? null : current.resolvedAt),
      replies: updatedReplies,
      updatedAt: new Date().toISOString(),
    };

    let emailDispatchResult: { success: boolean; provider?: string; error?: string } | null = null;
    if (replyMessage && String(replyMessage).trim() && current.email && current.email.includes("@")) {
      try {
        emailDispatchResult = await sendEmailReplyToStudent(supabase, {
          to: current.email.trim(),
          studentName: current.studentName || "Mag-aaral",
          ticketNumber: current.ticketNumber || id,
          subject: current.subject || "Student Concern Inquiry",
          replyMessage: String(replyMessage).trim(),
          senderName: resolvedBy || senderName || "IT Support Officer",
        });
      } catch (mailErr: any) {
        console.error("Failed to send email reply to student:", mailErr);
      }
    }

    const saved = await saveStoredConcerns(supabase, concerns);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save updated concern." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Concern updated successfully.",
        concern: concerns[index],
        emailDispatched: emailDispatchResult?.success || false,
        emailProvider: emailDispatchResult?.provider || null,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("PATCH concern error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update concern." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE: Remove concern record
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Concern ID is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const concerns = await getStoredConcerns(supabase);
    const updated = concerns.filter((c) => c.id !== id);

    const saved = await saveStoredConcerns(supabase, updated);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to delete concern." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: "Concern deleted successfully." },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("DELETE concern error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete concern." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
