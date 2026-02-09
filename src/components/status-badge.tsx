const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-green-50 text-green-700" },
  partial: { label: "Partial", className: "bg-amber-50 text-amber-700" },
  missed: { label: "Missed", className: "bg-red-50 text-red-700" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  active: { label: "Active", className: "bg-blue-50 text-blue-700" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-700" },
  paused: { label: "Paused", className: "bg-slate-100 text-slate-600" },
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-500" },
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-700" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
