"use client";

import { useState } from "react";
import { CategoryTag } from "@/components/category-tag";
import { WeekPicker } from "@/components/week-picker";
import { toggleDayStatus } from "@/app/actions/weekly-goals";
import { updateWeeklyGoalStatus } from "@/app/actions/weekly-goals";
import {
  type DayKey,
  type DailyStatus,
  DAY_KEYS,
  DAY_LABELS,
  getTodayIndex,
  cycleDay,
  computeStatusFromDaily,
} from "@/lib/daily-status";
import { useRouter } from "next/navigation";

interface WeeklyGoal {
  id: string;
  title: string;
  status: string;
  daily_status: DailyStatus | null;
  client_notes: string | null;
  coach_notes: string | null;
  week_start: string;
  quarterly_goal: {
    id: string;
    title: string;
    goal: {
      id: string;
      title: string;
      category: string;
    } | null;
  } | null;
}

export function ThisWeekTab({
  weeklyGoals,
  weekStart,
}: {
  weeklyGoals: WeeklyGoal[];
  weekStart: string;
}) {
  const router = useRouter();
  const todayIdx = getTodayIndex(weekStart);
  const isCurrent = todayIdx >= 0;

  function handleWeekChange(newWeek: string) {
    router.push(`/portal?tab=thisweek&week=${newWeek}`);
  }

  // Day header dates
  const weekMon = new Date(weekStart + "T00:00:00");

  // Status counts
  const counts = {
    total: weeklyGoals.length,
    completed: weeklyGoals.filter((g) => g.status === "completed").length,
    partial: weeklyGoals.filter((g) => g.status === "partial").length,
    missed: weeklyGoals.filter((g) => g.status === "missed").length,
    pending: weeklyGoals.filter((g) => g.status === "pending").length,
  };

  return (
    <div>
      {/* Week picker */}
      <div className="mb-4">
        <WeekPicker weekStart={weekStart} onChange={handleWeekChange} />
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAY_KEYS.map((key, i) => {
          const dayDate = new Date(weekMon);
          dayDate.setDate(weekMon.getDate() + i);
          const isToday = isCurrent && todayIdx === i;
          const isPast = isCurrent && i < todayIdx;

          return (
            <div
              key={key}
              className={`text-center py-2 rounded-lg ${
                isToday
                  ? "bg-brand-500 text-white"
                  : isPast
                    ? "bg-surface-100 text-txt-400"
                    : "bg-surface-50 text-txt-600"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase">
                {DAY_LABELS[key]}
              </div>
              <div
                className={`text-xs mt-0.5 ${isToday ? "text-white/80" : "text-txt-400"}`}
              >
                {dayDate.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status summary */}
      {weeklyGoals.length > 0 && (
        <div className="flex gap-3 mb-4 text-xs">
          <span className="font-medium text-txt-700">{counts.total} goals</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {counts.completed} done
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {counts.partial} partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {counts.missed} missed
          </span>
        </div>
      )}

      {/* Goal cards */}
      {weeklyGoals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500">No goals for this week yet.</p>
          <p className="text-xs text-txt-400 mt-1">
            Add goals from the My Goals tab, or your coach will assign them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeklyGoals.map((goal) => (
            <DailyGoalCard
              key={goal.id}
              goal={goal}
              weekStart={weekStart}
              todayIdx={todayIdx}
              isCurrent={isCurrent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DailyGoalCard({
  goal,
  weekStart,
  todayIdx,
  isCurrent,
}: {
  goal: WeeklyGoal;
  weekStart: string;
  todayIdx: number;
  isCurrent: boolean;
}) {
  const initialDaily = (goal.daily_status || {}) as DailyStatus;
  const [daily, setDaily] = useState<DailyStatus>(initialDaily);
  const [status, setStatus] = useState(goal.status);
  const [notes, setNotes] = useState(goal.client_notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const router = useRouter();
  const category = goal.quarterly_goal?.goal?.category;

  async function handleToggle(dayKey: DayKey) {
    // Optimistic update
    const currentVal = daily[dayKey];
    const newVal = cycleDay(currentVal);
    const updatedDaily = { ...daily };
    if (newVal === null) {
      delete updatedDaily[dayKey];
    } else {
      updatedDaily[dayKey] = newVal;
    }
    setDaily(updatedDaily);
    setStatus(computeStatusFromDaily(updatedDaily, weekStart));

    // Server call
    const result = await toggleDayStatus(goal.id, dayKey);
    if (result.error) {
      // Revert on error
      setDaily(initialDaily);
      setStatus(goal.status);
    } else {
      router.refresh();
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    await updateWeeklyGoalStatus(goal.id, status, notes);
    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  // Count completed days
  const doneCount = DAY_KEYS.filter((k) => daily[k] === true).length;
  const trackedCount = DAY_KEYS.filter(
    (k) => daily[k] === true || daily[k] === false
  ).length;

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-txt-900">{goal.title}</h4>
              {category && <CategoryTag category={category} />}
            </div>
            {goal.quarterly_goal && (
              <p className="text-[11px] text-txt-400 mt-0.5">
                {goal.quarterly_goal.title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <StatusPill status={status} />
            {trackedCount > 0 && (
              <span className="text-[11px] font-medium text-txt-500">
                {doneCount}/{trackedCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Day grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_KEYS.map((key, i) => {
            const value = daily[key];
            const isToday = isCurrent && todayIdx === i;
            const isFuture = isCurrent && i > todayIdx;
            const isPast = isCurrent && i < todayIdx;
            const isPastWeek = !isCurrent && todayIdx === -1;
            // For past weeks, all days are clickable; for future days in current week, disabled
            const canClick = !isFuture;

            return (
              <button
                key={key}
                onClick={() => canClick && handleToggle(key)}
                disabled={!canClick}
                className={`relative flex items-center justify-center h-10 rounded-lg transition-all ${
                  isToday
                    ? "ring-2 ring-brand-500 ring-offset-1"
                    : ""
                } ${
                  !canClick
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer hover:scale-105 active:scale-95"
                } ${
                  value === true
                    ? "bg-green-50 border border-green-200"
                    : value === false
                      ? "bg-red-50 border border-red-200"
                      : isPast && value === undefined
                        ? "bg-surface-50 border border-surface-200 border-dashed"
                        : "bg-surface-50 border border-surface-200"
                }`}
              >
                {value === true ? (
                  <svg className="w-4.5 h-4.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : value === false ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className={`w-2 h-2 rounded-full ${isToday ? "bg-brand-400" : "bg-surface-300"}`} />
                )}
                {/* Day label under circle */}
                <span className={`absolute -bottom-0.5 text-[8px] font-medium ${
                  value === true ? "text-green-600" : value === false ? "text-red-500" : "text-txt-400"
                }`}>
                  {DAY_LABELS[key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes toggle + content */}
      <div className="border-t border-surface-100 px-4 py-2.5">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-[11px] font-medium text-txt-500 hover:text-txt-700 transition"
        >
          <svg
            className={`w-3 h-3 transition ${showNotes ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Notes
          {(goal.client_notes || goal.coach_notes) && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          )}
        </button>

        {showNotes && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="text-[11px] font-medium text-txt-500 mb-1 block">
                My Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                placeholder="Add a note about this goal..."
                rows={2}
                className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
              />
              {dirty && (
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {saving ? "Saving..." : "Save note"}
                </button>
              )}
            </div>

            {goal.coach_notes && (
              <div className="p-2.5 bg-surface-50 rounded-lg">
                <p className="text-[11px] font-medium text-txt-500 mb-1">
                  Coach Notes
                </p>
                <p className="text-xs text-txt-700">{goal.coach_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: "bg-green-50", text: "text-green-700", label: "Done" },
    partial: { bg: "bg-amber-50", text: "text-amber-700", label: "Partial" },
    missed: { bg: "bg-red-50", text: "text-red-700", label: "Missed" },
    pending: { bg: "bg-gray-50", text: "text-gray-600", label: "Pending" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
