"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { CategoryTag, CATEGORIES } from "@/components/category-tag";
import { ProgressBar } from "@/components/progress-bar";
import { createGoal, updateGoal, deleteGoal } from "@/app/actions/goals";
import { useRouter } from "next/navigation";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  target_date: string | null;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export function GoalsTab({
  goals,
  clientId,
}: {
  goals: Goal[];
  clientId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate(formData: FormData) {
    setLoading(true);
    const result = await createGoal({
      clientId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      category: formData.get("category") as string,
      targetDate: (formData.get("target_date") as string) || undefined,
    });
    setLoading(false);
    if (!result.error) {
      setShowForm(false);
      router.refresh();
    }
  }

  async function handleUpdate(goalId: string, formData: FormData) {
    setLoading(true);
    await updateGoal(goalId, {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      category: formData.get("category") as string,
      targetDate: (formData.get("target_date") as string) || undefined,
    });
    setLoading(false);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(goalId: string) {
    if (!confirm("Delete this goal? All linked quarterly and weekly goals will also be deleted.")) return;
    await deleteGoal(goalId);
    router.refresh();
  }

  return (
    <div>
      {goals.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500 mb-3">
            No 3-year goals yet. Create the first one.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {goals.map((goal) =>
              editingId === goal.id ? (
                <GoalForm
                  key={goal.id}
                  goal={goal}
                  loading={loading}
                  onSubmit={(fd) => handleUpdate(goal.id, fd)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={goal.id}
                  className="border border-surface-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <CategoryTag category={goal.category} />
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={goal.status} />
                      <button
                        onClick={() => setEditingId(goal.id)}
                        className="p-1 text-txt-400 hover:text-txt-700 transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1 text-txt-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-txt-900 mb-1">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-txt-500 mb-3 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-1.5">
                    <ProgressBar value={goal.progress} size="sm" />
                    <span className="text-xs font-medium text-txt-500 shrink-0">
                      {goal.progress}%
                    </span>
                  </div>

                  {goal.target_date && (
                    <p className="text-[11px] text-txt-400">
                      Target:{" "}
                      {new Date(goal.target_date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )
            )}
          </div>

          {showForm ? (
            <GoalForm
              loading={loading}
              onSubmit={(fd) => handleCreate(fd)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-500 hover:text-brand-600 transition"
            >
              + Add 3-Year Goal
            </button>
          )}
        </>
      )}
    </div>
  );
}

function GoalForm({
  goal,
  loading,
  onSubmit,
  onCancel,
}: {
  goal?: Goal;
  loading: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="border border-brand-200 bg-brand-50/30 rounded-xl p-4 space-y-3"
    >
      <input
        name="title"
        defaultValue={goal?.title}
        placeholder="Goal title"
        required
        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
      />
      <select
        name="category"
        defaultValue={goal?.category || ""}
        required
        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
      >
        <option value="" disabled>
          Select category
        </option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        defaultValue={goal?.description || ""}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none"
      />
      <input
        type="date"
        name="target_date"
        defaultValue={goal?.target_date || ""}
        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-3 bg-white border border-surface-300 text-txt-700 text-sm font-medium rounded-lg hover:bg-surface-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-3 bg-txt-900 text-white text-sm font-medium rounded-lg hover:bg-txt-700 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : goal ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
