"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubTabNav } from "@/components/tab-nav";
import { StatusBadge } from "@/components/status-badge";
import { CategoryTag, CATEGORIES } from "@/components/category-tag";
import { ProgressBar } from "@/components/progress-bar";
import { createGoal, updateGoal, deleteGoal } from "@/app/actions/goals";
import {
  createQuarterlyGoal,
  updateQuarterlyGoal,
  deleteQuarterlyGoal,
} from "@/app/actions/quarterly-goals";
import {
  createWeeklyGoal,
  updateWeeklyGoal,
  deleteWeeklyGoal,
} from "@/app/actions/weekly-goals";
import { getEngagementQuarters, type QuarterOption } from "@/lib/quarters";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  target_date: string | null;
  status: string;
  progress: number;
  client_id: string;
}

interface QuarterlyGoal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  quarter_start: string;
  quarter_end: string;
  client_id: string;
  goal_id: string;
  goal: {
    id: string;
    title: string;
    category: string;
  } | null;
}

interface WeeklyGoal {
  id: string;
  title: string;
  status: string;
  client_id: string;
  week_start: string;
  week_end: string;
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

const SUB_TABS = [
  { id: "3year", label: "3-Year" },
  { id: "quarterly", label: "Quarterly" },
  { id: "weekly", label: "Weekly" },
];

export function MyGoalsTab({
  goals,
  quarterlyGoals,
  weeklyGoals,
  userId,
  engagementStart,
}: {
  goals: Goal[];
  quarterlyGoals: QuarterlyGoal[];
  weeklyGoals: WeeklyGoal[];
  userId: string;
  engagementStart: string | null;
}) {
  const [subTab, setSubTab] = useState("3year");

  return (
    <div>
      <div className="mb-4">
        <SubTabNav tabs={SUB_TABS} activeTab={subTab} onChange={setSubTab} />
      </div>

      {subTab === "3year" && <ThreeYearView goals={goals} userId={userId} />}
      {subTab === "quarterly" && (
        <QuarterlyView goals={quarterlyGoals} parentGoals={goals} userId={userId} engagementStart={engagementStart} />
      )}
      {subTab === "weekly" && (
        <WeeklyView goals={weeklyGoals} quarterlyGoals={quarterlyGoals} userId={userId} />
      )}
    </div>
  );
}

// ========== 3-YEAR GOALS ==========

function ThreeYearView({ goals, userId }: { goals: Goal[]; userId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      {goals.length === 0 && !showForm && (
        <div className="text-center py-6">
          <p className="text-sm text-txt-500">No 3-year goals yet.</p>
          <p className="text-xs text-txt-400 mt-1 mb-3">
            Set your long-term vision across life categories.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {goals.map((goal) =>
          editingId === goal.id ? (
            <GoalEditForm
              key={goal.id}
              goal={goal}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); router.refresh(); }}
            />
          ) : (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingId(goal.id)}
              onDeleted={() => router.refresh()}
            />
          )
        )}
      </div>

      {showForm ? (
        <AddGoalForm
          clientId={userId}
          onCancel={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); router.refresh(); }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-400 hover:text-brand-600 transition"
        >
          + Add 3-Year Goal
        </button>
      )}
    </div>
  );
}

function GoalCard({ goal, onEdit, onDeleted }: { goal: Goal; onEdit: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this goal? This will also remove its quarterly and weekly goals.")) return;
    setDeleting(true);
    await deleteGoal(goal.id);
    onDeleted();
  }

  return (
    <div className="border border-surface-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <CategoryTag category={goal.category} />
        <StatusBadge status={goal.status} />
      </div>
      <h4 className="text-sm font-semibold text-txt-900 mb-1">{goal.title}</h4>
      {goal.description && <p className="text-xs text-txt-500 mb-3 line-clamp-2">{goal.description}</p>}
      <div className="flex items-center gap-2 mb-2">
        <ProgressBar value={goal.progress} size="sm" />
        <span className="text-xs font-medium text-txt-500">{goal.progress}%</span>
      </div>
      {goal.target_date && (
        <p className="text-[11px] text-txt-400 mb-2">
          Target: {new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        <button onClick={onEdit} className="text-xs font-medium text-brand-600 hover:text-brand-700">Edit</button>
        <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium text-red-500 hover:text-red-600">{deleting ? "..." : "Delete"}</button>
      </div>
    </div>
  );
}

function AddGoalForm({ clientId, onCancel, onSaved }: { clientId: string; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("professional");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createGoal({ clientId, title, description: description || undefined, category });
    if (result.error) { setError(result.error); setSaving(false); }
    else onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-3">New 3-Year Goal</h4>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
            {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a six-figure business" required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what success looks like..." rows={2} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white resize-none" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Add Goal"}</button>
        </div>
      </div>
    </form>
  );
}

function GoalEditForm({ goal, onCancel, onSaved }: { goal: Goal; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || "");
  const [progress, setProgress] = useState(goal.progress);
  const [status, setStatus] = useState(goal.status);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateGoal(goal.id, { title, description, progress, status });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-3">Edit Goal</h4>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white resize-none" />
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-txt-600">Progress:</label>
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1" />
          <span className="text-xs font-medium text-txt-600 w-8">{progress}%</span>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </form>
  );
}

// ========== QUARTERLY GOALS ==========

function getQuarterOptions(engagementStart: string | null): QuarterOption[] {
  if (!engagementStart) return [];
  return getEngagementQuarters(engagementStart);
}

function QuarterlyView({ goals, parentGoals, userId, engagementStart }: { goals: QuarterlyGoal[]; parentGoals: Goal[]; userId: string; engagementStart: string | null }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const grouped = goals.reduce((acc, qg) => {
    const parentId = qg.goal?.id || "unknown";
    if (!acc[parentId]) acc[parentId] = { parent: qg.goal, goals: [] };
    acc[parentId].goals.push(qg);
    return acc;
  }, {} as Record<string, { parent: QuarterlyGoal["goal"]; goals: QuarterlyGoal[] }>);

  return (
    <div>
      {Object.keys(grouped).length === 0 && !showForm && (
        <div className="text-center py-6">
          <p className="text-sm text-txt-500">No quarterly goals yet.</p>
          <p className="text-xs text-txt-400 mt-1 mb-3">
            {parentGoals.length === 0 ? "Add a 3-year goal first, then break it into quarters." : "Break your 3-year goals into 90-day milestones."}
          </p>
        </div>
      )}

      <div className="space-y-5 mb-4">
        {Object.entries(grouped).map(([parentId, group]) => (
          <div key={parentId}>
            <div className="flex items-center gap-2 mb-2">
              {group.parent && <CategoryTag category={group.parent.category} />}
              <h4 className="text-sm font-semibold text-txt-900">{group.parent?.title || "Unknown"}</h4>
            </div>
            <div className="space-y-2 ml-2 pl-3 border-l-2 border-surface-200">
              {group.goals.map((qg) =>
                editingId === qg.id ? (
                  <QuarterlyEditForm
                    key={qg.id}
                    goal={qg}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); router.refresh(); }}
                  />
                ) : (
                  <QuarterlyCard
                    key={qg.id}
                    goal={qg}
                    onEdit={() => setEditingId(qg.id)}
                    onDeleted={() => router.refresh()}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {parentGoals.length > 0 && (
        showForm ? (
          <AddQuarterlyForm parentGoals={parentGoals} clientId={userId} engagementStart={engagementStart} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-2.5 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-400 hover:text-brand-600 transition">+ Add Quarterly Goal</button>
        )
      )}
    </div>
  );
}

function QuarterlyCard({ goal, onEdit, onDeleted }: { goal: QuarterlyGoal; onEdit: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (!confirm("Delete this quarterly goal? Its weekly goals will also be deleted.")) return;
    setDeleting(true);
    await deleteQuarterlyGoal(goal.id);
    onDeleted();
  }
  const quarterLabel = `${new Date(goal.quarter_start + "T00:00:00").toLocaleDateString("en-US", { month: "short" })} – ${new Date(goal.quarter_end + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <div className="p-3 border border-surface-200 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-sm font-medium text-txt-900">{goal.title}</h5>
        <StatusBadge status={goal.status} />
      </div>
      {goal.description && <p className="text-xs text-txt-500 mb-2">{goal.description}</p>}
      <div className="flex items-center gap-2 mb-1">
        <ProgressBar value={goal.progress} size="sm" />
        <span className="text-xs font-medium text-txt-500">{goal.progress}%</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-txt-400">{quarterLabel}</span>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-xs font-medium text-brand-600 hover:text-brand-700">Edit</button>
          <button onClick={handleDelete} disabled={deleting} className="text-xs font-medium text-red-500 hover:text-red-600">{deleting ? "..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function AddQuarterlyForm({ parentGoals, clientId, engagementStart, onCancel, onSaved }: { parentGoals: Goal[]; clientId: string; engagementStart: string | null; onCancel: () => void; onSaved: () => void }) {
  const quarterOptions = getQuarterOptions(engagementStart);
  const currentIdx = quarterOptions.findIndex((q) => q.isCurrent);
  const [goalId, setGoalId] = useState(parentGoals[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quarterIdx, setQuarterIdx] = useState(currentIdx >= 0 ? currentIdx : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const q = quarterOptions[quarterIdx];
    const result = await createQuarterlyGoal({ goalId, clientId, title, description: description || undefined, quarterStart: q.startDate, quarterEnd: q.endDate });
    if (result.error) { setError(result.error); setSaving(false); }
    else onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-3">New Quarterly Goal</h4>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Parent 3-Year Goal</label>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
            {parentGoals.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Quarter</label>
          <select value={quarterIdx} onChange={(e) => setQuarterIdx(Number(e.target.value))} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
            {quarterOptions.map((q, i) => (<option key={i} value={i}>{q.label}</option>))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Land 3 new clients this quarter" required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white resize-none" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Add Goal"}</button>
        </div>
      </div>
    </form>
  );
}

function QuarterlyEditForm({ goal, onCancel, onSaved }: { goal: QuarterlyGoal; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || "");
  const [progress, setProgress] = useState(goal.progress);
  const [status, setStatus] = useState(goal.status);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateQuarterlyGoal(goal.id, { title, description, progress, status });
    onSaved();
  }

  const quarterLabel = `${new Date(goal.quarter_start + "T00:00:00").toLocaleDateString("en-US", { month: "short" })} – ${new Date(goal.quarter_end + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-1">Edit Quarterly Goal</h4>
      <p className="text-[11px] text-txt-400 mb-3">{quarterLabel}</p>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white resize-none" placeholder="Description..." />
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-txt-600">Progress:</label>
          <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1" />
          <span className="text-xs font-medium text-txt-600 w-8">{progress}%</span>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </form>
  );
}

// ========== WEEKLY GOALS ==========

function WeeklyView({ goals, quarterlyGoals, userId }: { goals: WeeklyGoal[]; quarterlyGoals: QuarterlyGoal[]; userId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      {goals.length === 0 && !showForm && (
        <div className="text-center py-6">
          <p className="text-sm text-txt-500">No weekly goals for this week yet.</p>
          <p className="text-xs text-txt-400 mt-1 mb-3">
            {quarterlyGoals.length === 0 ? "Add quarterly goals first, then break them into weekly tasks." : "Break your quarterly goals into weekly tasks."}
          </p>
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        {goals.map((goal) => {
          const category = goal.quarterly_goal?.goal?.category;
          if (editingId === goal.id) {
            return (
              <WeeklyEditForm
                key={goal.id}
                goal={goal}
                onCancel={() => setEditingId(null)}
                onSaved={() => { setEditingId(null); router.refresh(); }}
              />
            );
          }
          return (
            <div key={goal.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-lg">
              <StatusIcon status={goal.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-txt-900">{goal.title}</p>
                {goal.quarterly_goal && <p className="text-xs text-txt-500">→ {goal.quarterly_goal.title}</p>}
              </div>
              <div className="flex items-center gap-2">
                {category && <CategoryTag category={category} />}
                <StatusBadge status={goal.status} />
                <button
                  onClick={() => setEditingId(goal.id)}
                  className="text-xs text-brand-600 hover:text-brand-700 ml-1"
                >
                  Edit
                </button>
                <button
                  onClick={async () => { if (confirm("Delete this weekly goal?")) { await deleteWeeklyGoal(goal.id); router.refresh(); } }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {quarterlyGoals.length > 0 && (
        showForm ? (
          <AddWeeklyForm quarterlyGoals={quarterlyGoals} clientId={userId} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-2.5 border-2 border-dashed border-surface-300 rounded-xl text-sm font-medium text-txt-500 hover:border-brand-400 hover:text-brand-600 transition">+ Add Weekly Goal</button>
        )
      )}
    </div>
  );
}

function AddWeeklyForm({ quarterlyGoals, clientId, onCancel, onSaved }: { quarterlyGoals: QuarterlyGoal[]; clientId: string; onCancel: () => void; onSaved: () => void }) {
  const [qGoalId, setQGoalId] = useState(quarterlyGoals[0]?.id || "");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const result = await createWeeklyGoal({ quarterlyGoalId: qGoalId, clientId, title, weekStart, weekEnd });
    if (result.error) { setError(result.error); setSaving(false); }
    else onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-3">New Weekly Goal</h4>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Quarterly Goal</label>
          <select value={qGoalId} onChange={(e) => setQGoalId(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
            {quarterlyGoals.map((qg) => (<option key={qg.id} value={qg.id}>{qg.title} {qg.goal ? `(${qg.goal.title})` : ""}</option>))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-txt-600 mb-1 block">Task</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete 5 cold outreach calls" required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        </div>
        <p className="text-[11px] text-txt-400">
          Week: {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Add Goal"}</button>
        </div>
      </div>
    </form>
  );
}

function WeeklyEditForm({ goal, onCancel, onSaved }: { goal: WeeklyGoal; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(goal.title);
  const [status, setStatus] = useState(goal.status);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateWeeklyGoal(goal.id, { title, status });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <h4 className="text-sm font-semibold text-txt-900 mb-3">Edit Weekly Goal</h4>
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg bg-white">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
          <option value="missed">Missed</option>
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-medium rounded-lg border border-surface-300 text-txt-600">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold rounded-lg bg-txt-900 text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </form>
  );
}

function StatusIcon({ status }: { status: string }) {
  const configs: Record<string, { bg: string; content: React.ReactNode }> = {
    completed: { bg: "bg-green-100", content: <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> },
    partial: { bg: "bg-amber-100", content: <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" /></svg> },
    missed: { bg: "bg-red-100", content: <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> },
    pending: { bg: "bg-gray-100", content: <div className="w-2.5 h-2.5 rounded-full bg-gray-400" /> },
  };
  const c = configs[status] || configs.pending;
  return <div className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>{c.content}</div>;
}
