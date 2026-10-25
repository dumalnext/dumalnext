// ==============================================================================
// DUMAL-NEXT: EMAIL DISPATCHER UTILITY (STUDENT PORTAL)
// ==============================================================================

export interface SendReceiptOptions {
  to: string;
  studentName: string;
  ticketNumber: string;
  subject: string;
}

export interface SendSecurityOtpOptions {
  to: string;
  studentName: string;
  code: string;
  purpose: "password_change" | "email_change";
  newEmail?: string;
}

export async function sendReceiptToStudent(
  supabase: any,
  options: SendReceiptOptions
): Promise<{ success: boolean; provider?: string }> {
  const { to, studentName, ticketNumber, subject } = options;
  if (!to || !to.includes("@")) return { success: false };

  const cleanSubject = `[Natanggap] Ticket #${ticketNumber}: ${subject || "Student Concern"}`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg NHS IT Support";

  const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
  <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 24px;">
    <h2 style="color: #002060; margin-top: 0;">Natanggap ang Iyong Mensahe</h2>
    <p>Kumusta, <strong>${studentName || "Mag-aaral"}</strong>,</p>
    <p>Matagumpay na natanggap ng aming IT Support Desk ang iyong mensahe ukol sa <strong>${subject}</strong>.</p>
    <div style="background-color: #f1f5f9; padding: 12px; border-radius: 4px; margin: 16px 0;">
      <strong>Ticket Number: #${ticketNumber}</strong>
    </div>
    <p>Kasalukuyan na itong sinusuri ng aming IT personnel. Makatatanggap ka ng aming opisyal na tugon dito sa iyong email.</p>
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

export async function sendSecurityOtpEmail(
  supabase: any,
  options: SendSecurityOtpOptions
): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { to, studentName, code, purpose, newEmail } = options;
  if (!to || !to.includes("@")) return { success: false, error: "Invalid recipient email" };

  const actionLabel = purpose === "password_change" ? "Password Modification" : "Email Address Update";
  const actionDescription =
    purpose === "password_change"
      ? "You have requested to change the password for your Dumalneg NHS Student Portal account."
      : `You have requested to change your official Student Portal login email to: <strong>${newEmail || to}</strong>.`;

  const cleanSubject = `[Dumalneg NHS] ${code} is your Security Verification Code`;
  const senderEmail = process.env.SYSTEM_FROM_EMAIL || "dumalnext@gmail.com";
  const senderDisplayName = "Dumalneg NHS Portal Security";

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
          Student Security &amp; Identity Verification
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold;">
          Dumalneg National High School
        </h1>
        <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0 0;">
          DepEd School ID: 300017 &bull; Student Portal Security
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
          Kumusta, <strong>${studentName || "Learner"}</strong>,
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
          ${actionDescription}
        </p>

        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 12px 0;">
          Please enter the following 6-digit verification code in the Student Portal to authorize this update:
        </p>

        <!-- Big 6-Digit Code Box -->
        <div style="background-color: #f1f5f9; border: 2px dashed #002060; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">
            One-Time Security Code (Valid for 15 minutes)
          </span>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #002060;">
            ${code}
          </div>
        </div>

        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 18px 0 0 0;">
          <strong>Security Notice:</strong> Dumalneg NHS personnel will never ask for your password or verification code. If you did not initiate this change, your account may be compromised. Please notify our IT Support Desk immediately at <code>dumalnext@gmail.com</code>.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">
          Dumalneg National High School &bull; IT Operations Office
        </p>
        <p style="margin: 0; color: #94a3b8;">
          Brgy. Cabaritan, Dumalneg, Ilocos Norte &bull; dumalnext@gmail.com
        </p>
      </td>
    </tr>
  </table>
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
      return { success: true, provider: "resend" };
    } catch (e: any) {
      console.warn("Resend email dispatch error:", e?.message);
    }
  }

  // Fallback: Console log for development or when Resend key is unconfigured
  console.log(`[SECURITY OTP DISPATCH] To: ${to} | Purpose: ${purpose} | Code: ${code}`);
  return { success: true, provider: "console_fallback" };
}
