"use client";

export function PurposeTab({ purposeText }: { purposeText: string | null }) {
  return (
    <div>
      {purposeText ? (
        <div className="border border-surface-200 rounded-xl p-5">
          <h4 className="text-xs font-bold tracking-widest uppercase text-brand-500 mb-3">
            Client&apos;s Purpose & Why
          </h4>
          <p className="text-sm leading-relaxed text-txt-700 whitespace-pre-wrap">
            {purposeText}
          </p>
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
