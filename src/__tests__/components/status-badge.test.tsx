import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

describe("StatusBadge", () => {
  const statuses = [
    { status: "completed", label: "Completed", expectedClass: "bg-green-50" },
    { status: "partial", label: "Partial", expectedClass: "bg-amber-50" },
    { status: "missed", label: "Missed", expectedClass: "bg-red-50" },
    { status: "pending", label: "Pending", expectedClass: "bg-gray-100" },
    { status: "active", label: "Active", expectedClass: "bg-blue-50" },
    { status: "in_progress", label: "In Progress", expectedClass: "bg-blue-50" },
    { status: "paused", label: "Paused", expectedClass: "bg-slate-100" },
    { status: "not_started", label: "Not Started", expectedClass: "bg-gray-100" },
    { status: "scheduled", label: "Scheduled", expectedClass: "bg-blue-50" },
    { status: "cancelled", label: "Cancelled", expectedClass: "bg-red-50" },
  ];

  statuses.forEach(({ status, label, expectedClass }) => {
    it(`renders "${status}" with label "${label}" and correct styling`, () => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain(expectedClass);
    });
  });

  it("falls back to gray for unknown status", () => {
    render(<StatusBadge status="unknown_status" />);
    const badge = screen.getByText("unknown_status");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-gray-100");
    expect(badge.className).toContain("text-gray-600");
  });

  it("renders as a span with pill styling", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.querySelector("span")!;
    expect(badge.tagName).toBe("SPAN");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });
});
