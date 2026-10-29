// ==============================================================================
// DUMAL-NEXT: EMAIL DISPATCHER UTILITY (ADMIN INBOUND RECEIPT)
// ==============================================================================

export interface SendReceiptOptions {
  to: string;
  studentName: string;
  ticketNumber: string;
  subject: string;
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
    <h2 style="color: #002060; margin-top: 0;">Your Inquiry Has Been Received</h2>
    <p>Greetings, <strong>${studentName || "Student"}</strong>,</p>
    <p>Our IT Support Desk has successfully received your message regarding <strong>${subject}</strong>.</p>
    <div style="background-color: #f1f5f9; padding: 12px; border-radius: 4px; margin: 16px 0;">
      <strong>Ticket Number: #${ticketNumber}</strong>
    </div>
    <p>Our IT personnel are currently reviewing your request. You will receive an official response via this email address.</p>
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
