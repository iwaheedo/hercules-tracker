"use client";

import { StatusBadge } from "@/components/status-badge";
import { generateICS, downloadICS } from "@/lib/ics-generator";

interface Checkin {
  id: string;
  scheduled_at: string;
  status: string;
  coach_notes: string | null;
  recurrence_group: string | null;
  duration_minutes: number;
}

export function ClientCheckinsTab({
  checkins,
  clientName,
  clientEmail,
  coachName,
  coachEmail,
}: {
  checkins: { upcoming: Checkin[]; past: Checkin[] };
  clientName: string;
  clientEmail: string;
  coachName: string;
  coachEmail: string;
}) {
  function handleDownloadICS(ci: Checkin) {
    // Count remaining recurring check-ins for RRULE COUNT
    let recurrenceCount = 0;
    if (ci.recurrence_group) {
      recurrenceCount = checkins.upcoming.filter(
        (c) => c.recurrence_group === ci.recurrence_group
      ).length;
    }

    const ics = generateICS({
      uid: ci.id,
      title: `Check-in with ${coachName}`,
      start: new Date(ci.scheduled_at),
      durationMinutes: ci.duration_minutes || 30,
      organizerName: coachName,
      organizerEmail: coachEmail || "coach@herculesapp.com",
      attendeeName: clientName,
      attendeeEmail: clientEmail || "client@herculesapp.com",
      isRecurring: !!ci.recurrence_group,
      recurrenceCount: recurrenceCount > 1 ? recurrenceCount : undefined,
    });

    const dateStr = new Date(ci.scheduled_at)
      .toISOString()
      .split("T")[0];
    downloadICS(ics, `checkin-${dateStr}.ics`);
  }

  return (
    <div>
      {/* Upcoming */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-txt-900 mb-3">Upcoming</h3>

        {checkins.upcoming.length === 0 ? (
          <p className="text-sm text-txt-500 py-3">
            No upcoming check-ins scheduled.
          </p>
        ) : (
          <div className="space-y-2">
            {checkins.upcoming.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center gap-3 p-3 border border-surface-200 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-txt-900">
                      {new Date(ci.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {ci.recurrence_group && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-txt-500">
                    {new Date(ci.scheduled_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadICS(ci)}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 border border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 transition font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </button>
                  <StatusBadge status={ci.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      <div>
        <h3 className="text-sm font-semibold text-txt-900 mb-3">Past</h3>

        {checkins.past.length === 0 ? (
          <p className="text-sm text-txt-500 py-3">No past check-ins yet.</p>
        ) : (
          <div className="space-y-3">
            {checkins.past.map((ci) => (
              <div
                key={ci.id}
                className="border border-surface-200 rounded-lg p-3.5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-txt-900">
                      {new Date(ci.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {ci.recurrence_group && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                        Recurring
                      </span>
                    )}
                    <StatusBadge status={ci.status} />
                  </div>
                </div>

                {/* Coach notes (read-only for client) */}
                {ci.coach_notes && (
                  <div className="mt-2 p-2.5 bg-surface-50 rounded-lg">
                    <p className="text-[11px] font-medium text-txt-500 mb-1">
                      Coach Notes
                    </p>
                    <p className="text-xs text-txt-700">{ci.coach_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
