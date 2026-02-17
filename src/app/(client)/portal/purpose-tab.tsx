"use client";

import { useState } from "react";
import { updatePurpose } from "@/app/actions/purpose";
import { useRouter } from "next/navigation";

export function ClientPurposeTab({
  purposeText,
}: {
  purposeText: string | null;
}) {
  const [text, setText] = useState(purposeText || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dirty = text !== (purposeText || "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updatePurpose(text);
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
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-txt-900 mb-1">
          Your Purpose & Why
        </h3>
        <p className="text-xs text-txt-500">
          Write about why your 3-year goals matter to you. What drives you?
          What does achieving these goals mean for your life?
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Why are these goals important to me? What am I working towards? What kind of life do I want to build..."
        rows={8}
        className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none leading-relaxed"
      />

      <div className="flex items-center gap-3 mt-3">
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
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
        <span className="text-xs text-txt-400 ml-auto">
          {text.length}/5000
        </span>
      </div>
    </div>
  );
}
