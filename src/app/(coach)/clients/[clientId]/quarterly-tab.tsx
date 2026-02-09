"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { CategoryTag } from "@/components/category-tag";
import { ProgressBar } from "@/components/progress-bar";
import {
  createQuarterlyGoal,
  updateQuarterlyGoal,
  deleteQuarterlyGoal,
} from "@/app/actions/quarterly-goals";
import { useRouter } from "next/navigation";

interface QuarterlyGoal {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  quarter_start: string;
  quarter_end: string;
  status: string;
  progress: number;
  client_notes: string | null;
  coach_notes: string | null;
  goal: {
    id: string;
    title: string;
    category: string;
    status: string;
  } | null;
}

interface ParentGoal {
  id: string;
  title: string;
  category: string;
}

export function QuarterlyTab({
  quarterlyGoals,
  parentGoals,
  clientId,
}: {
  quarterlyGoals: QuarterlyGoal[];
  parentGoals: ParentGoal[];
  clientId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Group quarterly goals by parent 3-year goal
  const grouped = quarterlyGoals.reduce(
    (acc, qg) => {
      const parentId = qg.goal?.id || "unknown";
      if (!acc[parentId]) {
        acc[parentId] = {
          parent: qg.goal,
          goals: [],
        };
      }
      acc[parentId].goals.push(qg);
      return acc;
    },
    {} as Record<string, { parent: QuarterlyGoal["goal"]; goals: QuarterlyGoal[] }>
  );

  function getQuarterOptions() {
    const options = [];
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    for (let offset = -4; offset <= 4; offset++) {
      const totalQuarters = currentQuarter + offset;
      const y = currentYear + Math.floor(totalQuarters / 4) + (totalQuarters < 0 ? -1 : 0);
      const q = ((totalQuarters % 4) + 4) % 4;
      const startMonth = q * 3;
      const start = new Date(y, startMonth, 1);
      const end = new Date(y, startMonth + 3, 0);
      const quarterNum = q + 1;
      const label = `Q${quarterNum} ${y} (${start.toLocaleDateString("en-US", { month: "short" })} – ${end.toLocaleDateString("en-US", { month: "short" })})`;
      options.push({ label, startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] });
    }
    return options;
  }

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const quarterIdx = Number(formData.get("quarter_idx"));
    const qOptions = getQuarterOptions();
    const q = qOptions[quarterIdx];

    await createQuarterlyGoal({
      goalId: formData.get("goal_id") as string,
      clientId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      quarterStart: q.startDate,
      quarterEnd: q.endDate,
    });
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this quarterly goal? All linked weekly goals will also be deleted.")) return;
    await deleteQuarterlyGoal(id);
    router.refresh();
  }

  const formatQuarter = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString("en-US", { month: "short" })} – ${e.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };

  return (
    <div>
      {Object.keys(grouped).length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500 mb-3">
            {parentGoals.length === 0
              ? "Create a 3-year goal first, then break it into quarterly milestones."
              : "No quarterly goals yet. Break down a 3-year goal into 90-day milestones."}
          </p>
          {parentGoals.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition"
            >
              Create Quarterly Goal
            </button>
          )}
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([parentId, group]) => (
            <div key={parentId} className="mb-6">
              {/* Parent goal header */}
              <div className="flex items-center gap-2 mb-3">
                {group.parent && (
                  <CategoryTag category={group.parent.category} />
                )}
                <h3 className="text-sm font-semibold text-txt-900">
                  {group.parent?.title || "Unknown Goal"}
                </h3>
              </div>

              {/* Quarterly goals under this parent */}
              <div className="space-y-3 ml-2 pl-3 border-l-2 border-surface-200">
                {group.goals.map((qg) => (
                  <div
                    key={qg.id}
                    className="border border-surface-200 rounded-lg p-3.5"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <h4 className="text-sm font-medium text-txt-900">
                          {qg.title}
                        </h4>
                        <p className="text-xs text-txt-500">
                          {formatQuarter(qg.quarter_start, qg.quarter_end)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={qg.status} />
                        <button
                          onClick={() => handleDelete(qg.id)}
                          className="p-1 text-txt-400 hover:text-red-500 transition"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {qg.description && (
                      <p className="text-xs text-txt-500 mb-2">
                        {qg.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <ProgressBar value={qg.progress} size="sm" />
                      <span className="text-xs font-medium text-txt-500 shrink-0">
                        {qg.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showForm ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate(new FormData(e.currentTarget));
              }}
              className="border border-brand-200 bg-brand-50/30 rounded-xl p-4 space-y-3 mt-4"
            >
              <select
                name="goal_id"
                required
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="" disabled selected>
                  Link to 3-year goal...
                </option>
                {parentGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <input
                name="title"
                placeholder="Quarterly goal title"
                required
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              <textarea
                name="description"
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
              />
              <div>
                <label className="text-xs text-txt-500 mb-1 block">
                  Quarter
                </label>
                <select
                  name="quarter_idx"
                  defaultValue={4}
                  required
                  className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  {getQuarterOptions().map((q, i) => (
                    <option key={i} value={i}>{q.label}</option>
                  ))}
                </select>
              </div>
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
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-500 hover:text-brand-600 transition mt-4"
            >
              + Add Quarterly Goal
            </button>
          )}
        </>
      )}
    </div>
  );
}
