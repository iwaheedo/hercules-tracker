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
  const saved = parsePurposeEntries(purposeText);
  const [entries, setEntries] = useState<string[]>(saved);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addText, setAddText] = useState("");
  const router = useRouter();

  async function persist(next: string[]) {
    setSaving(true);
    setError(null);
    const result = await updatePurpose(next);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return false;
    }
    setEntries(next);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    setSaving(false);
    router.refresh();
    return true;
  }

  async function handleSaveNew() {
    if (!addText.trim()) return;
    const next = [...entries, addText.trim()];
    const ok = await persist(next);
    if (ok) {
      setAddText("");
      setShowAdd(false);
    }
  }

  async function handleSaveEdit() {
    if (editingIndex === null || !draftText.trim()) return;
    const next = [...entries];
    next[editingIndex] = draftText.trim();
    const ok = await persist(next);
    if (ok) {
      setEditingIndex(null);
      setDraftText("");
    }
  }

  async function handleDelete(index: number) {
    const next = entries.filter((_, i) => i !== index);
    await persist(next);
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setDraftText(entries[index]);
    setShowAdd(false);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setDraftText("");
  }

  function startAdd() {
    setShowAdd(true);
    setAddText("");
    setEditingIndex(null);
  }

  function cancelAdd() {
    setShowAdd(false);
    setAddText("");
  }

  const hasRoom = entries.length < MAX_ENTRIES;
  const isEmpty = entries.length === 0 && !showAdd;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-txt-900 mb-1">
            Your Purpose & Why
          </h3>
          <p className="text-xs text-txt-500">
            {entries.length === 0
              ? "Define up to 3 key reasons why your goals matter to you."
              : "The reasons that drive you towards your goals."}
          </p>
        </div>
        {justSaved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 text-xs text-red-700 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <p className="text-sm font-medium text-txt-700 mb-1">
            What drives you?
          </p>
          <p className="text-xs text-txt-400 mb-5 max-w-xs mx-auto">
            Add up to 3 purpose points that remind you why your goals matter.
          </p>
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-txt-900 text-white rounded-lg hover:bg-txt-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add your first purpose
          </button>
        </div>
      )}

      {/* Saved entries list */}
      {entries.length > 0 && (
        <div className="space-y-2.5">
          {entries.map((entry, index) => (
            <div key={index}>
              {editingIndex === index ? (
                /* ── Edit mode ── */
                <div className="border border-brand-200 rounded-xl p-4 bg-brand-50/30">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{index + 1}</span>
                    </div>
                    <span className="text-xs font-medium text-brand-600">Editing</span>
                  </div>
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    maxLength={MAX_CHARS}
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-txt-400">{draftText.length}/{MAX_CHARS}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium text-txt-600 border border-surface-300 rounded-lg hover:bg-surface-50 transition disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!draftText.trim() || saving}
                        className="px-3 py-1.5 text-xs font-semibold bg-txt-900 text-white rounded-lg hover:bg-txt-700 transition disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Display mode ── */
                <div className="group border border-surface-200 rounded-xl p-4 hover:border-surface-300 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-brand-600">{index + 1}</span>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-txt-700 min-w-0">
                      {entry}
                    </p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={() => startEdit(index)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-xs text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new entry form */}
      {showAdd && (
        <div className={`border border-brand-200 rounded-xl p-4 bg-brand-50/30 ${entries.length > 0 ? "mt-2.5" : ""}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{entries.length + 1}</span>
            </div>
            <span className="text-xs font-medium text-brand-600">New purpose point</span>
          </div>
          <textarea
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            placeholder={
              entries.length === 0
                ? "What is your primary purpose? Why are these goals important?"
                : entries.length === 1
                  ? "What deeper motivation drives you forward?"
                  : "What kind of life do you want to build?"
            }
            maxLength={MAX_CHARS}
            rows={3}
            autoFocus
            className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-txt-400">{addText.length}/{MAX_CHARS}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelAdd}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-txt-600 border border-surface-300 rounded-lg hover:bg-surface-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!addText.trim() || saving}
                className="px-3 py-1.5 text-xs font-semibold bg-txt-900 text-white rounded-lg hover:bg-txt-700 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button — only when not already adding, has room, and has at least one entry */}
      {!showAdd && editingIndex === null && hasRoom && entries.length > 0 && (
        <button
          onClick={startAdd}
          className="mt-2.5 w-full py-3 flex items-center justify-center gap-1.5 text-xs font-medium text-txt-500 border-2 border-dashed border-surface-300 rounded-xl hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/20 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add another point ({entries.length}/{MAX_ENTRIES})
        </button>
      )}
    </div>
  );
}
