import { describe, it, expect } from "vitest";
import { generateICS } from "@/lib/ics-generator";

const baseParams = {
  uid: "test-checkin-123",
  title: "Coaching Check-in",
  start: new Date("2026-02-15T18:00:00Z"),
  durationMinutes: 30,
  organizerName: "Coach Waheed",
  organizerEmail: "coach@example.com",
  attendeeName: "Client FA",
  attendeeEmail: "fa@example.com",
};

describe("generateICS", () => {
  it("produces valid iCalendar structure", () => {
    const ics = generateICS(baseParams);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Hercules Tracker//Check-in//EN");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("sets correct UID", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("UID:test-checkin-123@herculesapp.com");
  });

  it("sets correct DTSTART and DTEND", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("DTSTART:20260215T180000Z");
    // 30 minutes later
    expect(ics).toContain("DTEND:20260215T183000Z");
  });

  it("calculates DTEND for 60-minute duration", () => {
    const ics = generateICS({ ...baseParams, durationMinutes: 60 });
    expect(ics).toContain("DTSTART:20260215T180000Z");
    expect(ics).toContain("DTEND:20260215T190000Z");
  });

  it("includes SUMMARY with the title", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("SUMMARY:Coaching Check-in");
  });

  it("includes organizer and attendee", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("ORGANIZER;CN=Coach Waheed:MAILTO:coach@example.com");
    expect(ics).toContain("MAILTO:fa@example.com");
  });

  it("does NOT include RRULE for non-recurring event", () => {
    const ics = generateICS(baseParams);
    expect(ics).not.toContain("RRULE");
  });

  it("includes RRULE for recurring event", () => {
    const ics = generateICS({
      ...baseParams,
      isRecurring: true,
      recurrenceCount: 12,
    });
    expect(ics).toContain("RRULE:FREQ=WEEKLY;COUNT=12");
  });

  it("does NOT include RRULE when recurrenceCount is 1", () => {
    const ics = generateICS({
      ...baseParams,
      isRecurring: true,
      recurrenceCount: 1,
    });
    expect(ics).not.toContain("RRULE");
  });

  it("escapes special characters in text fields", () => {
    const ics = generateICS({
      ...baseParams,
      title: "Check-in: Review, Plan; Execute",
      organizerName: "Coach, Test",
    });
    // The ICS spec escapes commas, semicolons, and backslashes (not colons in SUMMARY)
    expect(ics).toContain("SUMMARY:Check-in: Review\\, Plan\\; Execute");
    expect(ics).toContain("CN=Coach\\, Test");
  });

  it("uses CRLF line endings", () => {
    const ics = generateICS(baseParams);
    // Every line should end with \r\n
    expect(ics).toContain("\r\n");
    // Should not have bare \n without \r
    const lines = ics.split("\r\n");
    for (const line of lines) {
      if (line.length > 0) {
        expect(line).not.toContain("\n");
      }
    }
  });

  it("includes METHOD:REQUEST", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("METHOD:REQUEST");
  });

  it("includes STATUS:CONFIRMED", () => {
    const ics = generateICS(baseParams);
    expect(ics).toContain("STATUS:CONFIRMED");
  });
});
