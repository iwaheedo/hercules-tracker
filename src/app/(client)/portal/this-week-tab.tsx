"use client";

import { useState } from "react";
import { CategoryTag } from "@/components/category-tag";
import { WeekPicker } from "@/components/week-picker";
import { updateWeeklyGoalStatus } from "@/app/actions/weekly-goals";
import { useRouter } from "next/navigation";

interface WeeklyGoal {
  id: string;
  title: string;
  status: string;
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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-600 border-gray-200" },
  { value: "completed", label: "Done", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "partial", label: "Partial", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "missed", label: "Missed", color: "bg-red-50 text-red-700 border-red-200" },
];

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ThisWeekTab({
  weeklyGoals,
  weekStart,
}: {
  weeklyGoals: WeeklyGoal[];
  weekStart: string;
}) {
  const router = useRouter();

  function handleWeekChange(newWeek: string) {
    router.push(`/portal?tab=thisweek&week=${newWeek}`);
  }

  // Today's day of week (0=Sunday, 1=Monday, etc.)
  const today = new Date();
  const todayDay = today.getDay();
  const todayIdx = todayDay === 0 ? 6 : todayDay - 1;

  const weekMon = new Date(weekStart + "T00:00:00");
  const isCurrentWeek = (() => {
    const todayMon = new Date(today);
    const day = todayMon.getDay();
    todayMon.setDate(todayMon.getDate() - day + (day === 0 ? -6 : 1));
    return todayMon.toISOString().split("T")[0] === weekStart;
  })();

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

      {/* Days of the week bar */}
      <div className="flex gap-1 mb-5">
        {DAY_NAMES.map((day, i) => {
          const dayDate = new Date(weekMon);
          dayDate.setDate(weekMon.getDate() + i);
          const isToday = isCurrentWeek && todayIdx === i;
          const isPast = isCurrentWeek && i < todayIdx;
          return (
            <div
              key={day}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                isToday
                  ? "bg-brand-500 text-white"
                  : isPast
                  ? "bg-surface-100 text-txt-400"
                  : "bg-surface-50 text-txt-600"
              }`}
            >
              <div>{day.slice(0, 3)}</div>
              <div className={`text-[10px] mt-0.5 ${isToday ? "text-white/80" : "text-txt-400"}`}>
                {dayDate.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {weeklyGoals.length > 0 && (
        <div className="flex gap-3 mb-5 text-xs">
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
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            {counts.pending} pending
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
        <div className="space-y-4">
          {weeklyGoals.map((goal) => (
            <WeeklyGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeeklyGoalCard({ goal }: { goal: WeeklyGoal }) {
  const [status, setStatus] = useState(goal.status);
  const [notes, setNotes] = useState(goal.client_notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const category = goal.quarterly_goal?.goal?.category;

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setSaving(true);
    await updateWeeklyGoalStatus(goal.id, newStatus, notes || undefined);
    setSaving(false);
    router.refresh();
  }

  async function handleSaveNotes() {
    setSaving(true);
    await updateWeeklyGoalStatus(goal.id, status, notes);
    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  return (
    <div className="border border-surface-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-txt-900 mb-1">{goal.title}</h4>
          <div className="flex items-center gap-2">
            {category && <CategoryTag category={category} />}
            {goal.quarterly_goal && (
              <span className="text-[11px] text-txt-400">→ {goal.quarterly_goal.title}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            disabled={saving}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
              status === opt.value
                ? opt.color + " border-current"
                : "bg-white border-surface-200 text-txt-500 hover:bg-surface-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-medium text-txt-500 mb-1 block">My Notes</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          placeholder="Add a note about this goal..."
          rows={2}
          className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
        />
        {dirty && (
          <button onClick={handleSaveNotes} disabled={saving} className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            {saving ? "Saving..." : "Save note"}
          </button>
        )}
      </div>

      {goal.coach_notes && (
        <div className="mt-3 p-2.5 bg-surface-50 rounded-lg">
          <p className="text-[11px] font-medium text-txt-500 mb-1">Coach Notes</p>
          <p className="text-xs text-txt-700">{goal.coach_notes}</p>
        </div>
      )}
    </div>
  );
}
