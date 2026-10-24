const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const CODE_FONT_STACK =
  "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, 'Courier New', monospace";

const COLORS = {
  page: "#f5f7fb",
  card: "#ffffff",
  cardBorder: "#e8ecf3",
  primary: "#0b4da2",
  primaryBorder: "#cfdcf0",
  codePanel: "#e7eefa",
  heading: "#0f1b2d",
  body: "#475363",
  muted: "#6b7787",
  label: "#5d6a7c",
};

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

type EmailShellOptions = {
  /** Preview line shown next to the subject in the inbox. */
  preheader: string;
  /** Used for the document <title>. */
  heading: string;
  /** Pre-escaped HTML for the card body. */
  contentHtml: string;
  /** Closing line in the footer, e.g. what to do if this wasn't you. */
  footerNote?: string;
  /** Omit the office and automated-message footer for minimal emails. */
  includeOrganizationFooter?: boolean;
};

/**
 * Text-only stand-in for the office seal, matching the one the app draws: no
 * MOA is in place authorizing use of the CCRO or City of Legazpi official
 * artwork, so it is initials rather than an image. Outlook ignores the radius
 * and shows a square, which reads fine.
 */
function renderIdentity() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                  <tr>
                    <td width="40" height="40" align="center" valign="middle" bgcolor="${COLORS.card}" style="width:40px;height:40px;border:1px solid ${COLORS.primaryBorder};border-radius:20px;font-family:${FONT_STACK};font-size:10px;font-weight:800;line-height:1;letter-spacing:-0.02em;color:${COLORS.primary};">CCRO</td>
                    <td valign="middle" style="padding-left:12px;font-family:${FONT_STACK};font-size:18px;font-weight:800;line-height:1.2;letter-spacing:-0.025em;color:${COLORS.heading};">CiviCheck</td>
                  </tr>
                </table>`;
}

function renderGreeting(greeting?: string) {
  return greeting
    ? `<p style="margin:0 0 10px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${COLORS.body};">${escapeHtml(greeting)}</p>`
    : "";
}

function renderHeading(heading: string) {
  return `<h1 style="margin:0 0 14px;font-family:${FONT_STACK};font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:${COLORS.heading};">${escapeHtml(heading)}</h1>`;
}

function renderParagraphs(paragraphs: string[]) {
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 20px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${COLORS.body};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
}

/** Fine print under the main content — the lines run together as one paragraph. */
function renderNote(noteLines: string[]) {
  return noteLines.length
    ? `<p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${COLORS.muted};">${noteLines.map((line) => escapeHtml(line)).join(" ")}</p>`
    : "";
}

/**
 * Splits an even-length code in half ("66281551" → "6628 1551") so it can be
 * read off the screen and typed in two glances. The sign-in screen's field is
 * drawn in the same two groups. Anything else is left as sent.
 */
function formatCode(code: string) {
  if (code.length < 6 || code.length % 2 !== 0) return code;
  const half = code.length / 2;
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

/**
 * The branded frame shared by every automated email. Table-based layout with
 * inline styles throughout — Outlook's Word rendering engine ignores most
 * modern CSS, so nothing here should depend on it.
 */
function renderEmailShell({
  preheader,
  heading,
  contentHtml,
  footerNote,
  includeOrganizationFooter = true,
}: EmailShellOptions) {
  const footerNoteHtml = footerNote
    ? `${escapeHtml(footerNote)}${includeOrganizationFooter ? "<br /><br />" : ""}`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${escapeHtml(heading)}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .civic-pad { padding: 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLORS.page};">${escapeHtml(preheader)}</div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${COLORS.page};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;border-collapse:separate;background-color:${COLORS.card};border:1px solid ${COLORS.cardBorder};border-radius:24px;">
            <tr>
              <td class="civic-pad" style="padding:32px;">
                ${renderIdentity()}
                ${contentHtml}
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;">
            <tr>
              <td style="padding:20px 8px 0;text-align:center;font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${COLORS.muted};">
                ${footerNoteHtml}${includeOrganizationFooter ? `City Civil Registrar Office · City Government of Legazpi<br />
                This is an automated message — please do not reply to it.` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderCodePanel(code: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0 0 24px;">
                  <tr>
                    <td align="center" bgcolor="${COLORS.codePanel}" style="border-radius:16px;padding:24px 16px;">
                      <p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:13px;font-weight:700;line-height:1.4;color:${COLORS.label};">Your verification code</p>
                      <span style="font-family:${CODE_FONT_STACK};font-size:34px;font-weight:700;line-height:1.2;letter-spacing:4px;word-spacing:8px;white-space:nowrap;color:${COLORS.primary};">${escapeHtml(formatCode(code))}</span>
                    </td>
                  </tr>
                </table>`;
}

/** Minimal confirmation email shared by signup and resend. */
export function renderVerificationEmail(code: string) {
  const heading = "Confirm your email address";

  return renderEmailShell({
    preheader: heading,
    heading,
    includeOrganizationFooter: false,
    footerNote: "If you did not request this, you can safely ignore this email.",
    contentHtml: `${renderHeading(heading)}
                ${renderCodePanel(code)}

                <p style="margin:0;text-align:center;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${COLORS.muted};">This code expires in 1 hour.</p>`,
  });
}

type OtpEmailOptions = {
  /** Preview line shown next to the subject in the inbox. */
  preheader: string;
  heading: string;
  /** Rendered above the heading, e.g. "Hello Juan," */
  greeting?: string;
  paragraphs: string[];
  /** The one-time numeric code the recipient types into the app. */
  code: string;
  /** Fine print under the code — runs together as one paragraph. */
  noteLines?: string[];
  /** Closing line in the footer, e.g. what to do if this wasn't you. */
  footerNote?: string;
};

/**
 * Renders a transactional email built around a one-time code the recipient
 * types back into the app, rather than a link they click.
 */
export function renderOtpEmail({
  preheader,
  heading,
  greeting,
  paragraphs,
  code,
  noteLines = [],
  footerNote,
}: OtpEmailOptions) {
  return renderEmailShell({
    preheader,
    heading,
    footerNote,
    contentHtml: `${renderGreeting(greeting)}
                ${renderHeading(heading)}
                ${renderParagraphs(paragraphs)}

                ${renderCodePanel(code)}

                ${renderNote(noteLines)}`,
  });
}

type LinkEmailOptions = Omit<OtpEmailOptions, "code"> & {
  /** Text on the call-to-action button. */
  actionLabel: string;
  /** Single-use URL the button opens. */
  actionUrl: string;
};

/**
 * Renders a transactional email built around one button the recipient clicks,
 * for flows that begin outside the app (e.g. a system administrator sending a
 * password reset or verification link on someone's behalf).
 */
export function renderLinkEmail({
  preheader,
  heading,
  greeting,
  paragraphs,
  actionLabel,
  actionUrl,
  noteLines = [],
  footerNote,
}: LinkEmailOptions) {
  return renderEmailShell({
    preheader,
    heading,
    footerNote,
    contentHtml: `${renderGreeting(greeting)}
                ${renderHeading(heading)}
                ${renderParagraphs(paragraphs)}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                  <tr>
                    <td bgcolor="${COLORS.primary}" style="border-radius:999px;">
                      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:13px 28px;font-family:${FONT_STACK};font-size:16px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;">${escapeHtml(actionLabel)}</a>
                    </td>
                  </tr>
                </table>

                ${renderNote(noteLines)}`,
  });
}
