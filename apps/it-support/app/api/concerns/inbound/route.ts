import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { sendReceiptToStudent } from "@/lib/emailDispatcher";

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

// POST: Inbound email webhook handler (Resend, SendGrid, Mailgun, or direct relay)
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database client initialization failed." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const payload = await req.json();

    // 1. Extract sender, subject, and text from various webhook formats
    let rawFrom = payload.from || payload.sender || payload.from_email || "";
    let rawTo = payload.to || payload.recipient || "";
    let rawSubject = payload.subject || "No Subject";
    let rawMessage = payload.text || payload["stripped-text"] || payload.html || payload.message || payload.body || "";

    // If text contains HTML, strip basic tags for clean storage
    let cleanMessage = String(rawMessage)
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!cleanMessage) {
      cleanMessage = "(Walang mensahe na kalakip sa natanggap na email)";
    }

    // Extract clean email and name from format: "Juan Dela Cruz <juandelacruz@gmail.com>"
    let senderEmail = "";
    let senderName = "";

    const emailMatch = String(rawFrom).match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      senderEmail = emailMatch[1].trim().toLowerCase();
      senderName = String(rawFrom).replace(/<[^>]+>/, "").replace(/"/g, "").trim();
    } else {
      senderEmail = String(rawFrom).trim().toLowerCase();
    }

    if (!senderEmail || !senderEmail.includes("@")) {
      return NextResponse.json(
        { error: "Invalid sender email address in payload." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Fetch existing concerns list
    const { data: setRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "student_concerns")
      .maybeSingle();

    let concerns: any[] = [];
    if (setRow && setRow.value && Array.isArray(setRow.value.concerns)) {
      concerns = setRow.value.concerns;
    }

    // 3. Check if subject or message contains an existing Ticket Number (e.g. #DNHS-CON-12345)
    const ticketMatch = (rawSubject + " " + cleanMessage).match(/(?:Ticket\s*#?|#)(DNHS-CON-\d+)/i) ||
                        (rawSubject + " " + cleanMessage).match(/(DNHS-CON-\d+)/i);

    if (ticketMatch && ticketMatch[1]) {
      const targetTicketNum = ticketMatch[1].toUpperCase();
      const existingIdx = concerns.findIndex((c) => c.ticketNumber?.toUpperCase() === targetTicketNum);

      if (existingIdx !== -1) {
        const existing = concerns[existingIdx];
        const existingReplies = Array.isArray(existing.replies) ? existing.replies : [];

        existingReplies.push({
          id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: "student",
          senderName: senderName || existing.studentName || "Mag-aaral (via Email)",
          message: cleanMessage,
          createdAt: new Date().toISOString(),
        });

        concerns[existingIdx] = {
          ...existing,
          status: existing.status === "resolved" ? "in_progress" : existing.status,
          replies: existingReplies,
          updatedAt: new Date().toISOString(),
        };

        await supabase.from("system_settings").upsert({
          key: "student_concerns",
          value: { concerns },
          updated_at: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: true,
            action: "reply_appended",
            ticketNumber: existing.ticketNumber,
            message: `Reply appended to ticket #${existing.ticketNumber}.`,
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 4. If no existing ticket matched, CREATE A NEW CONCERN from inbound email!
    // Try to auto-link student profile by email
    let studentLrn = "";
    let studentGrade = "Grade 7";
    let matchedName = senderName;

    const { data: matchedUser } = await supabase
      .from("users")
      .select("id, user_id, email")
      .eq("email", senderEmail)
      .limit(1);

    if (matchedUser && matchedUser[0]) {
      const uId = matchedUser[0].id;
      const { data: stProfile } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", uId)
        .limit(1);

      if (stProfile && stProfile[0]) {
        studentLrn = stProfile[0].student_id || stProfile[0].lrn || "";
        matchedName = `${stProfile[0].first_name || ""} ${stProfile[0].last_name || ""}`.trim() || matchedName;
        if (stProfile[0].grade_level) studentGrade = `Grade ${stProfile[0].grade_level}`;
      }
    }

    // If still no LRN, check in students table directly
    if (!studentLrn) {
      const { data: stDirect } = await supabase
        .from("students")
        .select("*")
        .eq("email", senderEmail)
        .limit(1);
      if (stDirect && stDirect[0]) {
        studentLrn = stDirect[0].student_id || stDirect[0].lrn || "";
        matchedName = `${stDirect[0].first_name || ""} ${stDirect[0].last_name || ""}`.trim() || matchedName;
        if (stDirect[0].grade_level) studentGrade = `Grade ${stDirect[0].grade_level}`;
      }
    }

    // Categorize
    const lowerCombined = (rawSubject + " " + cleanMessage).toLowerCase();
    let detectedCategory = "other";
    if (lowerCombined.includes("password") || lowerCombined.includes("reset") || lowerCombined.includes("kalimutan")) {
      detectedCategory = "password_reset";
    } else if (lowerCombined.includes("lrn") || lowerCombined.includes("profile")) {
      detectedCategory = "lrn_profile";
    } else if (lowerCombined.includes("enroll") || lowerCombined.includes("enrol")) {
      detectedCategory = "enrollment";
    }

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newTicketNumber = `DNHS-CON-${randomSuffix}`;

    const newConcern = {
      id: `con_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber: newTicketNumber,
      studentName: matchedName || "Mag-aaral (via Email)",
      email: senderEmail,
      lrn: studentLrn,
      gradeLevel: studentGrade,
      contactNumber: "",
      category: detectedCategory,
      subject: rawSubject,
      message: cleanMessage,
      status: "pending",
      priority: detectedCategory === "password_reset" ? "high" : "medium",
      source: "inbound_email",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    concerns.unshift(newConcern);

    await supabase.from("system_settings").upsert({
      key: "student_concerns",
      value: { concerns },
      updated_at: new Date().toISOString(),
    });

    // Send confirmation receipt back to student
    try {
      await sendReceiptToStudent(supabase, {
        to: senderEmail,
        studentName: matchedName || "Mag-aaral",
        ticketNumber: newTicketNumber,
        subject: rawSubject,
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        action: "concern_created",
        ticketNumber: newTicketNumber,
        message: `New student concern created from inbound email (Ticket #${newTicketNumber}).`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/concerns/inbound error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process inbound email." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
