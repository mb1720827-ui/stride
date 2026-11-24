// The private calendar feed (iCalendar, RFC 5545) that Google or Apple Calendar can subscribe to.

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Splits a line into chunks of at most 75 bytes (continuations start with a space), never inside a character. */
function fold(line: string): string {
  const lines: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    const limit = lines.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      lines.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  lines.push(current);
  return lines.join("\r\n ");
}

export function toIcs(items: { id: string; title: string; starts_at: string; minutes: number; status: string }[], now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Stride//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Stride"];
  for (const i of items) {
    const start = new Date(i.starts_at);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${i.id}@stride`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(new Date(start.getTime() + i.minutes * 60_000))}`,
      `SUMMARY:${escape(i.status === "done" ? `✓ ${i.title}` : i.title)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
