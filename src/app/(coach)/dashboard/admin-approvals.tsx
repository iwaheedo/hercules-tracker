"use client";

import { useState } from "react";
import { approveCoach } from "@/app/actions/admin";

interface PendingCoach {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

export function AdminApprovals({
  pendingCoaches,
}: {
  pendingCoaches: PendingCoach[];
}) {
  const [coaches, setCoaches] = useState(pendingCoaches);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(coachId: string) {
    setLoadingId(coachId);
    const result = await approveCoach(coachId);
    if (!result.error) {
      setCoaches((prev) => prev.filter((c) => c.id !== coachId));
    }
    setLoadingId(null);
  }

  if (coaches.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-amber-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-txt-900">
          Pending Coach Approvals
        </h2>
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          {coaches.length}
        </span>
      </div>

      <div className="space-y-3">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-txt-900">
                {coach.full_name}
              </p>
              <p className="text-xs text-txt-500">
                {coach.email || "No email"}
              </p>
              <p className="text-xs text-txt-400">
                Signed up{" "}
                {new Date(coach.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => handleApprove(coach.id)}
              disabled={loadingId === coach.id}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loadingId === coach.id ? "Approving..." : "Approve"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
