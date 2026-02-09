"use client";

import { useState, useCallback } from "react";
import { StatusBadge } from "@/components/status-badge";
import { CategoryTag } from "@/components/category-tag";
import { WeekPicker, getCurrentWeekStart, getWeekEnd } from "@/components/week-picker";
import { createWeeklyGoal, updateWeeklyGoal } from "@/app/actions/weekly-goals";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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

interface QuarterlyOption {
  id: string;
  title: string;
  goal?: { category: string } | null;
}

export function WeeklyTab({
  weeklyGoals,
  quarterlyGoals,
  clientId,
  weekStart,
}: {
  weeklyGoals: WeeklyGoal[];
  quarterlyGoals: QuarterlyOption[];
  clientId: string;
  weekStart: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleWeekChange = useCallback(
    (newWeek: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "weekly");
      params.set("week", newWeek);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  async function handleCreate(formData: FormData) {
    setLoading(true);
    await createWeeklyGoal({
      quarterlyGoalId: formData.get("quarterly_goal_id") as string,
      clientId,
      title: formData.get("title") as string,
      weekStart,
      weekEnd: getWeekEnd(weekStart),
    });
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleSaveCoachNotes(goalId: string, notes: string) {
    setSavingNotes(goalId);
    await updateWeeklyGoal(goalId, { coachNotes: notes });
    setSavingNotes(null);
  }

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
      {/* Week Picker */}
      <div className="flex items-center justify-between mb-5">
        <WeekPicker weekStart={weekStart} onChange={handleWeekChange} />
      </div>

      {/* Status summary */}
      {counts.total > 0 && (
        <div className="flex gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {counts.completed} completed
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

      {/* Goals list */}
      {weeklyGoals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500 mb-3">
            No weekly goals for this week.
          </p>
          {quarterlyGoals.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition"
            >
              Add Weekly Goal
            </button>
          )}
          {quarterlyGoals.length === 0 && (
            <p className="text-xs text-txt-400 mt-1">
              Create a quarterly goal first to add weekly goals.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {weeklyGoals.map((goal) => (
            <WeeklyGoalCard
              key={goal.id}
              goal={goal}
              savingNotes={savingNotes === goal.id}
              onSaveNotes={(notes) => handleSaveCoachNotes(goal.id, notes)}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      {weeklyGoals.length > 0 && !showForm && quarterlyGoals.length > 0 && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-500 hover:text-brand-600 transition"
        >
          + Add Weekly Goal
        </button>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate(new FormData(e.currentTarget));
          }}
          className="border border-brand-200 bg-brand-50/30 rounded-xl p-4 space-y-3 mt-3"
        >
          <select
            name="quarterly_goal_id"
            required
            className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="" disabled selected>
              Link to quarterly goal...
            </option>
            {quarterlyGoals.map((qg) => (
              <option key={qg.id} value={qg.id}>
                {qg.title}
              </option>
            ))}
          </select>
          <input
            name="title"
            placeholder="Weekly goal title"
            required
            className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          />
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
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function WeeklyGoalCard({
  goal,
  savingNotes,
  onSaveNotes,
}: {
  goal: WeeklyGoal;
  savingNotes: boolean;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(goal.coach_notes || "");
  const [dirty, setDirty] = useState(false);

  const category = goal.quarterly_goal?.goal?.category;

  return (
    <div className="border border-surface-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-txt-900">{goal.title}</h4>
            <StatusBadge status={goal.status} />
          </div>
          <div className="flex items-center gap-2">
            {category && <CategoryTag category={category} />}
            {goal.quarterly_goal && (
              <span className="text-[11px] text-txt-400">
                → {goal.quarterly_goal.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Client notes (read-only) */}
      {goal.client_notes && (
        <div className="mt-3 p-2.5 bg-surface-50 rounded-lg">
          <p className="text-[11px] font-medium text-txt-500 mb-1">
            Client Note
          </p>
          <p className="text-xs text-txt-700">{goal.client_notes}</p>
        </div>
      )}

      {/* Coach notes (editable) */}
      <div className="mt-3">
        <p className="text-[11px] font-medium text-txt-500 mb-1">
          Coach Notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Add coaching notes..."
          rows={2}
          className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
        />
        {dirty && (
          <button
            onClick={() => {
              onSaveNotes(notes);
              setDirty(false);
            }}
            disabled={savingNotes}
            className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {savingNotes ? "Saving..." : "Save notes"}
          </button>
        )}
      </div>
    </div>
  );
}
