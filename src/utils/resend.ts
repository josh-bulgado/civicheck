interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined in the environment variables");
  }

  // Use the verified domain address if configured, or fallback to onboarding@resend.dev for testing.
  // Note: onboarding@resend.dev can only send to the email address that created the Resend account.
  const fromAddress = "CiviCheck <noreply@civicheck.abrdns.com>";

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
