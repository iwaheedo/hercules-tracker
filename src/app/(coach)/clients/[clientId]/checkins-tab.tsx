"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { createCheckin, updateCheckin, cancelRecurrence } from "@/app/actions/checkins";
import { generateICS, downloadICS } from "@/lib/ics-generator";
import { useRouter } from "next/navigation";

interface Checkin {
  id: string;
  scheduled_at: string;
  status: string;
  coach_notes: string | null;
  recurrence_group: string | null;
  duration_minutes: number;
}

export function CheckinsTab({
  checkins,
  clientId,
  clientName,
  clientEmail,
  coachName,
  coachEmail,
}: {
  checkins: { upcoming: Checkin[]; past: Checkin[] };
  clientId: string;
  clientName: string;
  clientEmail: string;
  coachName: string;
  coachEmail: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const isRecurring = formData.get("isRecurring") === "on";
    await createCheckin({
      clientId,
      scheduledAt: new Date(`${date}T${time}`).toISOString(),
      isRecurring,
      recurrenceWeeks: 12,
    });
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleMarkComplete(checkinId: string) {
    await updateCheckin(checkinId, { status: "completed" });
    router.refresh();
  }

  async function handleSaveNotes(checkinId: string, notes: string) {
    setSavingNotes(checkinId);
    await updateCheckin(checkinId, { coachNotes: notes });
    setSavingNotes(null);
  }

  async function handleStopRecurrence(recurrenceGroupId: string) {
    if (!confirm("Cancel all future check-ins in this recurring series?")) return;
    await cancelRecurrence(recurrenceGroupId);
    router.refresh();
  }

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
      title: `Coaching Check-in: ${clientName}`,
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

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div>
      {/* Upcoming */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-txt-900">Upcoming</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + Schedule Check-in
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate(new FormData(e.currentTarget));
            }}
            className="border border-brand-200 bg-brand-50/30 rounded-lg p-3 space-y-2.5 mb-3"
          >
            <div className="flex gap-2">
              <input
                type="date"
                name="date"
                required
                className="flex-1 px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              <input
                type="time"
                name="time"
                defaultValue="18:00"
                required
                className="w-32 px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            {/* Repeat weekly toggle */}
            <label className="flex items-center gap-2 text-sm text-txt-700 cursor-pointer">
              <input
                type="checkbox"
                name="isRecurring"
                className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500/20"
              />
              <span>Repeat weekly</span>
              <span className="text-xs text-txt-400">(12 weeks)</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 px-3 bg-white border border-surface-300 text-txt-700 text-sm font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-3 bg-txt-900 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </form>
        )}

        {checkins.upcoming.length === 0 ? (
          <p className="text-sm text-txt-500 py-3">No upcoming check-ins.</p>
        ) : (
          <div className="space-y-2">
            {checkins.upcoming.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between p-3 border border-surface-200 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-txt-900">
                        {formatDateTime(ci.scheduled_at)}
                      </p>
                      {ci.recurrence_group && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                          Recurring
                        </span>
                      )}
                    </div>
                    <StatusBadge status={ci.status} />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {/* Add to Calendar */}
                  <button
                    onClick={() => handleDownloadICS(ci)}
                    className="p-1.5 text-txt-400 hover:text-brand-600 transition"
                    title="Add to Calendar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {/* Stop recurrence */}
                  {ci.recurrence_group && (
                    <button
                      onClick={() => handleStopRecurrence(ci.recurrence_group!)}
                      className="text-[11px] font-medium text-red-500 hover:text-red-700"
                      title="Cancel recurring series"
                    >
                      Stop
                    </button>
                  )}

                  <button
                    onClick={() => handleMarkComplete(ci.id)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Complete
                  </button>
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
              <PastCheckinCard
                key={ci.id}
                checkin={ci}
                saving={savingNotes === ci.id}
                onSaveNotes={(notes) => handleSaveNotes(ci.id, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PastCheckinCard({
  checkin,
  saving,
  onSaveNotes,
}: {
  checkin: Checkin;
  saving: boolean;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(checkin.coach_notes || "");
  const [dirty, setDirty] = useState(false);

  return (
    <div className="border border-surface-200 rounded-lg p-3.5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-txt-900">
            {new Date(checkin.scheduled_at).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          {checkin.recurrence_group && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
              Recurring
            </span>
          )}
          <StatusBadge status={checkin.status} />
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[11px] font-medium text-txt-500 mb-1">
          Coach Notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Add notes about this check-in..."
          rows={2}
          className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
        />
        {dirty && (
          <button
            onClick={() => {
              onSaveNotes(notes);
              setDirty(false);
            }}
            disabled={saving}
            className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {saving ? "Saving..." : "Save notes"}
          </button>
        )}
      </div>
    </div>
  );
}
