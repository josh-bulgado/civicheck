interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined in the environment variables");
  }

  // The address must use a sending domain verified in this Resend account.
  // Keep the existing sender until a replacement is explicitly configured.
  const fromAddress =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "CiviCheck <noreply@civicheck.abrdns.com>";
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromAddress,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    console.error("Resend API Error:", errorBody);
    throw new Error(
      errorBody.message || `Failed to send email via Resend: ${response.statusText}`
    );
  }

  return response.json();
}
