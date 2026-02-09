"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { useRouter } from "next/navigation";

export function SettingsForm({
  fullName,
  email,
  phone,
}: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const [name, setName] = useState(fullName);
  const [phoneNum, setPhoneNum] = useState(phone);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isDirty = name !== fullName || phoneNum !== phone;

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const result = await updateProfile({
      fullName: name.trim(),
      phone: phoneNum.trim(),
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-txt-700 mb-1.5 block">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-txt-700 mb-1.5 block">
          Email
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg bg-surface-50 text-txt-500 cursor-not-allowed"
        />
        <p className="text-[11px] text-txt-400 mt-1">
          Email cannot be changed
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-txt-700 mb-1.5 block">
          Phone
        </label>
        <input
          type="tel"
          value={phoneNum}
          onChange={(e) => setPhoneNum(e.target.value)}
          placeholder="+1 234 567 8900"
          className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900 placeholder:text-txt-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={loading || !isDirty || !name.trim()}
          className="px-4 py-2.5 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
