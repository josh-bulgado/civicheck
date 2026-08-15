const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const COLORS = {
  page: "#eef1f6",
  card: "#ffffff",
  border: "#cfd8e5",
  header: "#0b3f86",
  headerMuted: "#a8c0e0",
  accent: "#fdd300",
  primary: "#0b4da2",
  heading: "#0f1b2d",
  body: "#475363",
  muted: "#6b7787",
  noteBg: "#f0f5fc",
  noteBorder: "#d7e2f3",
  noteText: "#3c4a5e",
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

type ActionEmailOptions = {
  /** Preview line shown next to the subject in the inbox. */
  preheader: string;
  heading: string;
  /** Rendered above the heading, e.g. "Hello Juan," */
  greeting?: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  /** Highlighted box under the button — one line per entry. */
  noteLines?: string[];
  /** Closing line in the footer, e.g. what to do if this wasn't you. */
  footerNote?: string;
};

/**
 * Renders a transactional email around a single call to action.
 *
 * Table-based layout with inline styles throughout — Outlook's Word rendering
 * engine ignores most modern CSS, so nothing here should depend on it.
 */
export function renderActionEmail({
  preheader,
  heading,
  greeting,
  paragraphs,
  actionLabel,
  actionUrl,
  noteLines = [],
  footerNote,
}: ActionEmailOptions) {
  const href = escapeHtml(actionUrl);

  const greetingHtml = greeting
    ? `<p style="margin:0 0 10px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${COLORS.body};">${escapeHtml(greeting)}</p>`
    : "";

  const paragraphsHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${COLORS.body};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  const noteHtml = noteLines.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;background-color:${COLORS.noteBg};border:1px solid ${COLORS.noteBorder};border-radius:10px;">
            <tr>
              <td style="padding:14px 18px;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${COLORS.noteText};">
                ${noteLines.map((line) => escapeHtml(line)).join("<br />")}
              </td>
            </tr>
          </table>`
    : "";

  const footerNoteHtml = footerNote
    ? `${escapeHtml(footerNote)}<br /><br />`
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
        .civic-head-pad { padding: 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLORS.page};">${escapeHtml(preheader)}</div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${COLORS.page};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:separate;background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
            <tr>
              <td class="civic-head-pad" style="background-color:${COLORS.header};padding:28px 32px;">
                <p style="margin:0;font-family:${FONT_STACK};font-size:24px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:#ffffff;">CiviCheck</p>
                <p style="margin:6px 0 0;font-family:${FONT_STACK};font-size:11px;font-weight:600;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.headerMuted};">City Civil Registrar Office · Legazpi City</p>
              </td>
            </tr>
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background-color:${COLORS.accent};">&nbsp;</td>
            </tr>
            <tr>
              <td class="civic-pad" style="padding:32px;">
                ${greetingHtml}
                <h1 style="margin:0 0 14px;font-family:${FONT_STACK};font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;color:${COLORS.heading};">${escapeHtml(heading)}</h1>
                ${paragraphsHtml}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
                  <tr>
                    <td align="center" bgcolor="${COLORS.primary}" style="border-radius:8px;">
                      <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(actionLabel)}</a>
                    </td>
                  </tr>
                </table>

                ${noteHtml}

                <p style="margin:26px 0 8px;font-family:${FONT_STACK};font-size:13px;line-height:1.5;color:${COLORS.muted};">Button not working? Copy and paste this link into your browser:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;background-color:${COLORS.page};border:1px solid ${COLORS.border};border-radius:8px;">
                  <tr>
                    <td style="padding:12px 14px;font-family:${FONT_STACK};font-size:12px;line-height:1.6;word-break:break-all;">
                      <a href="${href}" style="color:${COLORS.primary};text-decoration:none;">${href}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:20px 8px 0;text-align:center;font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${COLORS.muted};">
                ${footerNoteHtml}City Civil Registrar Office · City Government of Legazpi<br />
                This is an automated message — please do not reply to it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
