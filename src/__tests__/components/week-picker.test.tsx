import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getCurrentWeekStart, getWeekEnd } from "@/components/week-picker";

// Note: WeekPicker component uses useCallback from React, so we test the
// exported utility functions directly and the component behavior via rendering.

describe("getCurrentWeekStart", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = getCurrentWeekStart();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a Monday", () => {
    const result = getCurrentWeekStart();
    const date = new Date(result + "T00:00:00");
    // getDay() returns 1 for Monday
    expect(date.getDay()).toBe(1);
  });
});

describe("getWeekEnd", () => {
  it("returns the Sunday 6 days after Monday", () => {
    const end = getWeekEnd("2026-02-09"); // Monday
    expect(end).toBe("2026-02-15"); // Sunday
  });

  it("returns correct end for different weeks", () => {
    expect(getWeekEnd("2026-02-16")).toBe("2026-02-22");
    expect(getWeekEnd("2026-01-05")).toBe("2026-01-11");
    expect(getWeekEnd("2025-12-29")).toBe("2026-01-04"); // year boundary
  });
});

describe("WeekPicker component", () => {
  // Dynamic import so the component is loaded after mocks are in place
  it("renders the date range", async () => {
    const { WeekPicker } = await import("@/components/week-picker");
    const onChange = vi.fn();
    render(<WeekPicker weekStart="2026-02-09" onChange={onChange} />);

    // Should show Feb 9 – Feb 15, 2026
    expect(screen.getByText(/Feb 9/)).toBeInTheDocument();
    expect(screen.getByText(/Feb 15/)).toBeInTheDocument();
  });

  it("navigates to previous week on back click", async () => {
    const { WeekPicker } = await import("@/components/week-picker");
    const onChange = vi.fn();
    const { container } = render(<WeekPicker weekStart="2026-02-09" onChange={onChange} />);

    // The back button is the first button with an SVG chevron-left
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[0]);
    expect(onChange).toHaveBeenCalledWith("2026-02-02");
  });

  it("navigates to next week on forward click", async () => {
    const { WeekPicker } = await import("@/components/week-picker");
    const onChange = vi.fn();
    const { container } = render(<WeekPicker weekStart="2026-02-09" onChange={onChange} />);

    // The forward button is the second button
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[1]);
    expect(onChange).toHaveBeenCalledWith("2026-02-16");
  });

  it("shows 'Today' button when not on current week", async () => {
    const { WeekPicker } = await import("@/components/week-picker");
    const onChange = vi.fn();
    // Use a past week
    render(<WeekPicker weekStart="2025-01-06" onChange={onChange} />);
    const todayButtons = screen.getAllByText("Today");
    expect(todayButtons.length).toBeGreaterThanOrEqual(1);
  });
});
