// ==============================================================================
// DUMAL-NEXT: EMAIL DISPATCHER UTILITY (IT SUPPORT DESK)
// Dispatches official IT Support replies directly to student Gmail inboxes.
// Supports: Resend API, Inbound/Outbound Webhooks, and Audited DB Logging.
// ==============================================================================

export interface SendEmailReplyOptions {
  to: string;
  studentName: string;
  ticketNumber: string;
  subject: string;
  replyMessage: string;
  senderName: string;
}

export interface SendReceiptOptions {
  to: string;
  studentName: string;
  ticketNumber: string;
  subject: string;
}

export async function sendEmailReplyToStudent(
  supabase: any,
  options: SendEmailReplyOptions
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { to, studentName, ticketNumber, subject, replyMessage, senderName } = options;

  if (!to || !to.includes("@")) {
    return { success: false, error: "Invalid recipient email address." };
  }

  const cleanSubject = `Re: [Ticket #${ticketNumber}] ${subject || "Dumalneg NHS Student Concern"}`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg National High School IT Support";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cleanSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <tr>
      <td style="background-color: #002060; padding: 24px 28px; border-bottom: 4px solid #f59e0b;">
        <span style="color: #fde68a; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">
          Official IT Support Response Desk
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold;">
          Dumalneg National High School
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0 0;">
          Learner Management &amp; Technical Support System
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px;">
        <div style="background-color: #f1f5f9; border-left: 4px solid #002060; padding: 10px 14px; margin-bottom: 20px; border-radius: 4px;">
          <span style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Ticket Reference</span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; color: #002060;">
            #${ticketNumber} &bull; ${subject}
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Hello, <strong>${studentName || "Student"}</strong>,
        </p>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Here is the official response from our IT Support Desk regarding your account inquiry or password request:
        </p>

        <!-- Officer Reply Box -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: bold; color: #1e40af; margin-bottom: 8px;">
            Message from ${senderName}:
          </div>
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e3a8a; white-space: pre-wrap;">
${replyMessage}
          </p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 20px 0 0 0;">
          If you have further questions or need additional assistance, you may <strong>reply directly to this email</strong> (sent to <code>dumalnext@gmail.com</code>) or log in to the <strong>Student Portal</strong>.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">
          Dumalneg National High School &bull; IT Operations Office
        </p>
        <p style="margin: 0;">
          Cabaritan, Dumalneg, Ilocos Norte, Philippines &bull; dumalnext@gmail.com
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  let providerUsed = "audit_log";

  // 1. Try Gmail SMTP via Nodemailer if configured
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || "dumalnext@gmail.com";

  if (gmailPass) {
    try {
      let nodemailer: any = null;
      try {
        const req = eval("require");
        nodemailer = req("nodemailer");
      } catch {}
      if (!nodemailer) {
        throw new Error("nodemailer not available");
      }
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"${senderDisplayName}" <${gmailUser}>`,
        to,
        replyTo: "dumalnext@gmail.com",
        subject: cleanSubject,
        html: htmlContent,
      });

      providerUsed = "gmail_smtp";
    } catch (smtpErr) {
      console.warn("Gmail SMTP delivery error:", smtpErr);
    }
  }

  // 1. Try Resend API if API Key is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderDisplayName} <${senderEmail}>`,
          to: [to],
          subject: cleanSubject,
          html: htmlContent,
          reply_to: "dumalnext@gmail.com",
        }),
      });
      if (res.ok) {
        providerUsed = "resend";
      } else {
        const errText = await res.text();
        console.warn("Resend API warning:", errText);
      }
    } catch (apiErr) {
      console.warn("Resend API connection error:", apiErr);
    }
  }

  // 2. Persist in system_settings under 'outbound_emails' audit trail
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "outbound_emails")
      .maybeSingle();

    let logs = [];
    if (data && data.value && Array.isArray(data.value.emails)) {
      logs = data.value.emails;
    }

    logs.unshift({
      id: `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to,
      from: senderEmail,
      subject: cleanSubject,
      ticketNumber,
      provider: providerUsed,
      dispatchedAt: new Date().toISOString(),
      excerpt: replyMessage.substring(0, 150),
    });

    // Keep last 200 logs
    if (logs.length > 200) logs = logs.slice(0, 200);

    await supabase.from("system_settings").upsert({
      key: "outbound_emails",
      value: { emails: logs },
      updated_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn("Failed to save email audit log:", logErr);
  }

  console.log(`[Email Dispatcher] Official reply sent to ${to} (Ticket #${ticketNumber}) via ${providerUsed}`);

  return { success: true, provider: providerUsed };
}

export async function sendReceiptToStudent(
  supabase: any,
  options: SendReceiptOptions
): Promise<{ success: boolean; provider?: string }> {
  const { to, studentName, ticketNumber, subject } = options;
  if (!to || !to.includes("@")) return { success: false };

  const cleanSubject = `[Received] Ticket #${ticketNumber}: ${subject || "Student Concern"}`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg NHS IT Support";

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
    <h2 style="color: #002060; margin-top: 0;">Inquiry Received</h2>
    <p>Hello, <strong>${studentName || "Student"}</strong>,</p>
    <p>Our IT Support Desk has successfully received your inquiry regarding <strong>${subject}</strong>.</p>
    <div style="background-color: #f1f5f9; padding: 12px; border-radius: 4px; margin: 16px 0;">
      <strong>Ticket Number: #${ticketNumber}</strong>
    </div>
    <p>Our IT personnel are currently evaluating your request. You will receive an official response here in your email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #64748b; margin: 0;">Dumalneg National High School IT Support &bull; dumalnext@gmail.com</p>
  </div>
</body>
</html>
  `;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderDisplayName} <${senderEmail}>`,
          to: [to],
          subject: cleanSubject,
          html: htmlContent,
          reply_to: "dumalnext@gmail.com",
        }),
      });
    } catch {}
  }

  return { success: true };
}


export interface SendStaffInvitationOptions {
  to: string;
  fullName?: string;
  role: "teacher" | "admin" | "it_support";
  department?: string;
  inviteUrl: string;
}

export async function sendStaffInvitationEmail(
  supabase: any,
  options: SendStaffInvitationOptions
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { to, fullName, role, department, inviteUrl } = options;
  if (!to || !to.includes("@")) {
    return { success: false, error: "Invalid recipient email address." };
  }

  const roleTitle =
    role === "teacher"
      ? "Teacher / Faculty Member"
      : role === "admin"
      ? "School Administrator"
      : "IT Support Officer";

  const cleanSubject = `[Dumalneg NHS] Official Invitation to join as ${roleTitle}`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg National High School IT Support Desk";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cleanSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="background-color: #002060; padding: 24px 28px; border-bottom: 4px solid #f59e0b;">
        <span style="color: #fde68a; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">
          DepEd School ID: 300050 &bull; Staff Onboarding Desk
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold;">
          Dumalneg National High School
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0 0;">
          SDO Ilocos Norte, Region I
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px;">
        <div style="background-color: #eff6ff; border-left: 4px solid #002060; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <span style="font-size: 11px; color: #1e40af; font-weight: bold; text-transform: uppercase;">
            Institutional Assignment
          </span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; color: #002060;">
            ${roleTitle} &bull; ${department || "Dumalneg NHS Station"}
          </p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
          Greetings, <strong>${fullName || "Colleague"}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
          You have been formally invited by the Dumalneg NHS IT Support Desk to activate your digital workstation account as a <strong>${roleTitle}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
          Please click the button below to accept your invitation, confirm your registered email, and configure your official workstation password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #002060; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            Accept Invitation &amp; Set Up Password
          </a>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">
            Direct Activation Link:
          </span>
          <p style="margin: 0; font-size: 12px; font-family: monospace; word-break: break-all; color: #002060;">
            <a href="${inviteUrl}" style="color: #002060; text-decoration: underline;">${inviteUrl}</a>
          </p>
        </div>
        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0;">
          Notice: This invitation link is valid for 7 days. If you did not expect this invitation, please contact the IT Support Desk at <code>dumalnext@gmail.com</code>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f1f5f9; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">
          Dumalneg National High School &bull; IT Operations Office
        </p>
        <p style="margin: 0; color: #94a3b8;">
          Cabaritan, Dumalneg, Ilocos Norte, Philippines &bull; dumalnext@gmail.com
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  let providerUsed = "audit_log";

  // 1. Gmail SMTP via Nodemailer
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || "dumalnext@gmail.com";

  if (gmailPass) {
    try {
      const nodemailer = await import("nodemailer").then((m) => m.default || m).catch(() => null);
      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        await transporter.sendMail({
          from: `"${senderDisplayName}" <${gmailUser}>`,
          to,
          replyTo: "dumalnext@gmail.com",
          subject: cleanSubject,
          html: htmlContent,
        });

        providerUsed = "gmail_smtp";
      }
    } catch (smtpErr) {
      console.warn("Gmail SMTP staff invitation error:", smtpErr);
    }
  }

  // 2. Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (providerUsed === "audit_log" && resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderDisplayName} <${senderEmail}>`,
          to: [to],
          subject: cleanSubject,
          html: htmlContent,
          reply_to: "dumalnext@gmail.com",
        }),
      });
      if (res.ok) {
        providerUsed = "resend";
      }
    } catch (apiErr) {
      console.warn("Resend API connection error:", apiErr);
    }
  }

  // 3. Persist in system_settings under 'outbound_emails' audit trail
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "outbound_emails")
      .maybeSingle();

    let logs = [];
    if (data && data.value && Array.isArray(data.value.emails)) {
      logs = data.value.emails;
    }

    logs.unshift({
      id: `out_inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      to,
      from: senderEmail,
      subject: cleanSubject,
      role,
      provider: providerUsed,
      dispatchedAt: new Date().toISOString(),
      excerpt: `Staff Invitation for ${roleTitle} (${department || "General"})`,
    });

    await supabase.from("system_settings").upsert({
      key: "outbound_emails",
      value: { emails: logs.slice(0, 100) },
      updated_at: new Date().toISOString(),
    });
  } catch {}

  return { success: true, provider: providerUsed };
}
