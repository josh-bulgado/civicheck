interface SendEmailOptions {
  category: EmailCategory;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type EmailCategory = "auth" | "updates" | "alerts";

const senderEnvironmentVariables: Record<EmailCategory, string> = {
  auth: "RESEND_FROM_AUTH",
  updates: "RESEND_FROM_UPDATES",
  alerts: "RESEND_FROM_ALERTS",
};

export async function sendEmail({
  category,
  to,
  subject,
  html,
  text,
}: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not defined in the environment variables",
    );
  }

  // The address must use a sending domain verified in this Resend account.
  // Keep the shared sender as a migration fallback for existing deployments.
  const senderEnvironmentVariable = senderEnvironmentVariables[category];
  const fromAddress =
    process.env[senderEnvironmentVariable]?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromAddress) {
    throw new Error(
      `${senderEnvironmentVariable} or RESEND_FROM_EMAIL must be defined in the environment variables`,
    );
  }
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;

  const response = await fetch("https://api.resend.com/emails", {
    signal: AbortSignal.timeout(8000),
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
    console.error("Resend API request failed:", response.status);
    throw new Error(
      errorBody.message ||
        `Failed to send email via Resend: ${response.statusText}`,
    );
  }

  return response.json();
}
