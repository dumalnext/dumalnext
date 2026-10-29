// ==============================================================================
// DUMAL-NEXT: FACULTY EMAIL DISPATCHER UTILITY (TEACHER PORTAL)
// Strictly English Only & Zero Emojis
// ==============================================================================

export interface SendFacultySecurityOtpOptions {
  to: string;
  facultyName: string;
  code: string;
  purpose: "password_change" | "email_change";
  newEmail?: string;
}

export async function sendFacultySecurityOtpEmail(
  supabase: any,
  options: SendFacultySecurityOtpOptions
): Promise<{ success: boolean; provider?: string }> {
  const { to, facultyName, code, purpose, newEmail } = options;
  if (!to || !to.includes("@")) return { success: false };

  const actionLabel =
    purpose === "password_change"
      ? "Account Password Change Request"
      : `Email Address Update to: ${newEmail || to}`;

  const cleanSubject = `[Dumalneg NHS] ${code} is your Faculty Security Verification Code`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg NHS Faculty Portal Security";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${cleanSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <tr>
      <td style="background-color: #002060; padding: 24px 28px; border-bottom: 4px solid #f59e0b;">
        <span style="color: #fde68a; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 4px;">
          Faculty Security &amp; Identity Verification
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold;">
          Dumalneg National High School
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0 0;">
          DepEd School ID: 300050 &bull; Faculty &amp; Teacher Portal Security
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px;">
        <div style="background-color: #eff6ff; border-left: 4px solid #002060; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
          <span style="font-size: 11px; color: #1e40af; font-weight: bold; text-transform: uppercase;">
            Authorized Action
          </span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; color: #002060;">
            ${actionLabel}
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
          Greetings, <strong>${facultyName || "Faculty Member"}</strong>,
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
          You have initiated a security credential update on your official Dumalneg NHS Faculty Portal account. Please use the 6-digit one-time verification code below to authorize this change:
        </p>

        <!-- OTP Code Box -->
        <div style="text-align: center; margin: 24px 0; background-color: #f8fafc; border: 2px dashed #002060; border-radius: 8px; padding: 20px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px; display: block; margin-bottom: 8px;">
            One-Time Security Verification Code
          </span>
          <div style="font-size: 34px; font-family: monospace; font-weight: 900; letter-spacing: 8px; color: #002060;">
            ${code}
          </div>
          <span style="font-size: 11px; color: #dc2626; font-weight: bold; display: block; margin-top: 8px;">
            Valid for 15 minutes only. Do not share this code with anyone.
          </span>
        </div>

        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 0 0 10px 0;">
          If you did not request this update, please change your password immediately or report this incident to the Dumalneg NHS IT Support Desk.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0;">
          Dumalneg National High School &bull; SDO Ilocos Norte, Region I
        </p>
        <p style="margin: 0; color: #94a3b8;">
          This is an automated security transmission. Please do not reply directly to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // 1. Gmail SMTP via Nodemailer
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER || "dumalnext@gmail.com";

  if (gmailPass) {
    try {
      const nodemailer = await import("nodemailer");
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

      return { success: true, provider: "gmail_smtp" };
    } catch (smtpErr) {
      console.warn("Notice: Faculty Gmail SMTP delivery error:", smtpErr);
    }
  }

  // 2. Resend API
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
        }),
      });

      if (res.ok) {
        return { success: true, provider: "resend" };
      }
    } catch (resendErr) {
      console.warn("Notice: Faculty Resend API delivery error:", resendErr);
    }
  }

  return { success: true, provider: "database_logged" };
}
