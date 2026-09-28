/** Escape CSV cell; neutralize spreadsheet formula injection (= + - @), including leading whitespace/control. */
export function csvEscape(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  // Neutralize leading whitespace/control then formula chars (ClinicDesk parity + space)
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return lines.join("\n") + "\n";
}
