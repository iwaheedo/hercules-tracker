/**
 * RFC 5545 iCalendar (.ics) file generator
 * No external dependencies — pure string construction.
 */

interface ICSParams {
  uid: string; // unique event ID (use checkin id)
  title: string;
  start: Date;
  durationMinutes: number;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  isRecurring?: boolean;
  recurrenceCount?: number; // e.g. 12 for 12 weeks
}

/** Format a Date to iCalendar UTC format: 20260215T180000Z */
function formatDateUTC(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Generate an RFC 5545 compliant .ics string.
 * For recurring events, adds RRULE:FREQ=WEEKLY;COUNT=N
 */
export function generateICS(params: ICSParams): string {
  const {
    uid,
    title,
    start,
    durationMinutes,
    organizerName,
    organizerEmail,
    attendeeName,
    attendeeEmail,
    isRecurring = false,
    recurrenceCount = 12,
  } = params;

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hercules Tracker//Check-in//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}@herculesapp.com`,
    `DTSTAMP:${formatDateUTC(now)}`,
    `DTSTART:${formatDateUTC(start)}`,
    `DTEND:${formatDateUTC(end)}`,
    `SUMMARY:${escapeICSText(title)}`,
    `ORGANIZER;CN=${escapeICSText(organizerName)}:MAILTO:${organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${escapeICSText(organizerName)}:MAILTO:${organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${escapeICSText(attendeeName)}:MAILTO:${attendeeEmail}`,
    "STATUS:CONFIRMED",
  ];

  if (isRecurring && recurrenceCount > 1) {
    lines.push(`RRULE:FREQ=WEEKLY;COUNT=${recurrenceCount}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  // iCalendar requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}

/** Escape special characters in iCalendar text values */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Trigger a file download in the browser */
export function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
