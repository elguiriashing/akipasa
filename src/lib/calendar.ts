export type CalendarEntry = {
  uid: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  url: string;
};

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function calendarDate(value: string | Date) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldCalendarLine(line: string) {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function buildCalendar(entries: CalendarEntry[], now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AkiPasa//Premium Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...entries.flatMap((entry) => [
      "BEGIN:VEVENT",
      `UID:${escapeCalendarText(entry.uid)}`,
      `DTSTAMP:${calendarDate(now)}`,
      `DTSTART:${calendarDate(entry.startsAt)}`,
      `DTEND:${calendarDate(entry.endsAt)}`,
      `SUMMARY:${escapeCalendarText(entry.title)}`,
      `DESCRIPTION:${escapeCalendarText(entry.description)}`,
      `LOCATION:${escapeCalendarText(entry.location)}`,
      `URL:${escapeCalendarText(entry.url)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}
