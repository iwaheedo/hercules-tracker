"use client";

import { useCallback } from "react";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekStart(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isCurrentWeek(weekStart: string): boolean {
  const today = getMonday(new Date());
  return formatWeekStart(today) === weekStart;
}

export function WeekPicker({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (weekStart: string) => void;
}) {
  const monday = new Date(weekStart + "T00:00:00");
  const sunday = getSunday(monday);
  const isCurrent = isCurrentWeek(weekStart);

  const goBack = useCallback(() => {
    const prev = new Date(monday);
    prev.setDate(prev.getDate() - 7);
    onChange(formatWeekStart(prev));
  }, [monday, onChange]);

  const goForward = useCallback(() => {
    const next = new Date(monday);
    next.setDate(next.getDate() + 7);
    onChange(formatWeekStart(next));
  }, [monday, onChange]);

  const goToday = useCallback(() => {
    onChange(formatWeekStart(getMonday(new Date())));
  }, [onChange]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={goBack}
        className="p-1.5 rounded-lg hover:bg-surface-100 text-txt-500 hover:text-txt-900 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-txt-900">
          {formatDate(monday)} – {formatDate(sunday)}, {monday.getFullYear()}
        </span>
        {isCurrent && (
          <span className="text-[10px] font-semibold bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">
            Current Week
          </span>
        )}
      </div>

      <button
        onClick={goForward}
        className="p-1.5 rounded-lg hover:bg-surface-100 text-txt-500 hover:text-txt-900 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isCurrent && (
        <button
          onClick={goToday}
          className="text-xs font-medium text-brand-600 hover:text-brand-700 ml-1"
        >
          Today
        </button>
      )}
    </div>
  );
}

export function getCurrentWeekStart(): string {
  return formatWeekStart(getMonday(new Date()));
}

export function getWeekEnd(weekStart: string): string {
  const monday = new Date(weekStart + "T00:00:00");
  return formatWeekStart(getSunday(monday));
}
