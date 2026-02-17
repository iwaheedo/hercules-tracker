"use client";

import { useState } from "react";
import { updatePurpose } from "@/app/actions/purpose";
import { parsePurposeEntries } from "@/lib/purpose";
import { useRouter } from "next/navigation";

const MAX_ENTRIES = 3;
const MAX_CHARS = 500;

export function ClientPurposeTab({
  purposeText,
}: {
  purposeText: string | null;
}) {
  const initial = parsePurposeEntries(purposeText);
  // Always start with at least one entry field
  const [entries, setEntries] = useState<string[]>(
    initial.length > 0 ? initial : [""]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if anything changed from stored values
  const dirty =
    JSON.stringify(entries.map((e) => e.trim()).filter(Boolean)) !==
    JSON.stringify(initial);

  function handleChange(index: number, value: string) {
    const updated = [...entries];
    updated[index] = value;
    setEntries(updated);
    setSaved(false);
  }

  function handleAdd() {
    if (entries.length < MAX_ENTRIES) {
      setEntries([...entries, ""]);
    }
  }

  function handleRemove(index: number) {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated.length > 0 ? updated : [""]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updatePurpose(entries);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-txt-900 mb-1">
          Your Purpose & Why
        </h3>
        <p className="text-xs text-txt-500">
          Define up to 3 key reasons why your goals matter to you. What drives
          you? What does achieving these goals mean for your life?
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={index} className="relative">
            <div className="flex items-start gap-3">
              {/* Number badge */}
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-2">
                <span className="text-xs font-bold text-brand-600">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1">
                <textarea
                  value={entry}
                  onChange={(e) => handleChange(index, e.target.value)}
                  placeholder={
                    index === 0
                      ? "What is your primary purpose? Why are these goals important?"
                      : index === 1
                        ? "What deeper motivation drives you forward?"
                        : "What kind of life do you want to build?"
                  }
                  maxLength={MAX_CHARS}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[11px] text-txt-400">
                    {entry.length}/{MAX_CHARS}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => handleRemove(index)}
                      className="text-[11px] text-red-500 hover:text-red-600 font-medium transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add entry button */}
      {entries.length < MAX_ENTRIES && (
        <button
          onClick={handleAdd}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add another point
        </button>
      )}

      {/* Save bar */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-5 py-2 text-sm font-semibold bg-txt-900 text-white rounded-lg hover:bg-txt-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-xs text-green-600 font-medium">Saved</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
