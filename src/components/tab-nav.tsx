"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export function TabNav({
  tabs,
  activeTab,
  paramName = "tab",
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === tabs[0]?.id) {
        params.delete(paramName);
      } else {
        params.set(paramName, tabId);
      }
      const query = params.toString();
      router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams, paramName, tabs]
  );

  return (
    <div className="flex border-b border-surface-200 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === tab.id
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-txt-500 hover:text-txt-700 hover:border-surface-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SubTabNav({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
            activeTab === tab.id
              ? "bg-white text-txt-900 shadow-sm"
              : "text-txt-500 hover:text-txt-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
