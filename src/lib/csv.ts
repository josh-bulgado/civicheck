// Shared by every "Export" button: Payment History and the Reports ledger.

// Cells can hold applicant-typed text, so a leading = + - @ would run as a
// formula when the file is opened in Excel. Prefixing a quote keeps it as text.
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A header and its rows as CSV text, with a BOM so Excel reads UTF-8 (names with ñ, etc.). */
export function toCsv(
  header: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  const lines = rows.map((row) => row.map(csvCell).join(","));
  return `\uFEFF${[header.map(csvCell).join(","), ...lines].join("\r\n")}`;
}

/** Saves CSV text as a file. Browser only: call it from an event handler. */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
