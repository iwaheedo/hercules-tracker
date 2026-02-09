"use client";

import { useState } from "react";

interface GoalChange {
  id: string;
  goal_id: string;
  goal_type: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

const goalTypeBadge: Record<string, { label: string; className: string }> = {
  three_year: { label: "3-Year", className: "bg-blue-100 text-blue-700" },
  quarterly: { label: "Quarterly", className: "bg-purple-100 text-purple-700" },
  weekly: { label: "Weekly", className: "bg-green-100 text-green-700" },
};

const actionLabels: Record<string, string> = {
  created: "created",
  edited: "edited",
  status_updated: "updated status of",
};

export function ActivityTab({ changes }: { changes: GoalChange[] }) {
  const [filter, setFilter] = useState<"all" | "coach" | "client">("all");

  const filtered = changes.filter((c) => {
    if (filter === "all") return true;
    return c.user?.role === filter;
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-txt-500">Filter:</span>
        {(["all", "coach", "client"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${
              filter === f
                ? "bg-txt-900 text-white"
                : "bg-surface-100 text-txt-500 hover:text-txt-700"
            }`}
          >
            {f === "all" ? "All" : f === "coach" ? "Coach" : "Client"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500">No activity yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-surface-200" />

          <div className="space-y-4">
            {filtered.map((change) => {
              const badge = goalTypeBadge[change.goal_type] || goalTypeBadge.weekly;
              const initials = change.user?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "?";

              return (
                <div key={change.id} className="flex gap-3 relative">
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      change.user?.role === "coach"
                        ? "bg-txt-900 text-white"
                        : "bg-brand-100 text-brand-600"
                    }`}
                  >
                    <span className="text-[10px] font-bold">{initials}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-txt-700">
                      <span className="font-medium text-txt-900">
                        {change.user?.full_name || "Unknown"}
                      </span>{" "}
                      {actionLabels[change.action] || change.action}{" "}
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>{" "}
                      goal
                    </p>

                    {/* Field change detail */}
                    {change.field_changed && (
                      <div className="mt-1 text-xs text-txt-500">
                        <span className="font-medium">{change.field_changed}</span>
                        {change.old_value && (
                          <>
                            {" "}
                            <span className="line-through text-red-400">
                              {change.old_value.length > 50
                                ? change.old_value.slice(0, 50) + "..."
                                : change.old_value}
                            </span>
                          </>
                        )}
                        {change.new_value && (
                          <>
                            {" "}
                            → <span className="text-green-600">{change.new_value.length > 50 ? change.new_value.slice(0, 50) + "..." : change.new_value}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* New value only (for created) */}
                    {!change.field_changed && change.new_value && (
                      <p className="mt-0.5 text-xs text-txt-500">
                        &ldquo;{change.new_value}&rdquo;
                      </p>
                    )}

                    <p className="text-[11px] text-txt-400 mt-0.5">
                      {formatTime(change.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
