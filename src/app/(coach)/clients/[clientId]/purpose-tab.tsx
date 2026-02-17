"use client";

import { parsePurposeEntries } from "@/lib/purpose";

export function PurposeTab({ purposeText }: { purposeText: string | null }) {
  const entries = parsePurposeEntries(purposeText);

  return (
    <div>
      {entries.length > 0 ? (
        <div className="border border-surface-200 rounded-xl p-5">
          <h4 className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-4">
            Client&apos;s Purpose & Why
          </h4>
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-txt-700 pt-1">
                  {entry}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-txt-500">
            The client hasn&apos;t written their purpose yet.
          </p>
          <p className="text-xs text-txt-400 mt-1">
            They can add it from their portal under &quot;Purpose & Why&quot;.
          </p>
        </div>
      )}
    </div>
  );
}
