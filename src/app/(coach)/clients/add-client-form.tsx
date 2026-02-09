"use client";

import { useState } from "react";
import { inviteClient } from "@/app/actions/clients";
import { useRouter } from "next/navigation";

export function AddClientForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInviteLink(null);

    const result = await inviteClient(email.trim(), name.trim());

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.linked) {
      // Client already existed and was linked directly
      setLoading(false);
      setOpen(false);
      router.refresh();
    } else if (result.inviteLink) {
      setInviteLink(result.inviteLink);
      setLoading(false);
    } else {
      setLoading(false);
      setOpen(false);
      router.refresh();
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setEmail("");
    setName("");
    setError(null);
    setInviteLink(null);
    setCopied(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Client
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl border border-surface-200 p-6 w-full max-w-sm shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {!inviteLink ? (
                <>
                  <h2 className="text-lg font-bold text-txt-900 mb-1">
                    Invite a Client
                  </h2>
                  <p className="text-sm text-txt-500 mb-5">
                    Enter their details and we&apos;ll generate a sign-up link you can share.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-txt-700 mb-1.5 block">
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Abdur Rahman"
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900 placeholder:text-txt-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-txt-700 mb-1.5 block">
                        Client Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@example.com"
                        required
                        className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900 placeholder:text-txt-400"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5 rounded-lg">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 py-2.5 px-4 bg-white border border-surface-300 text-txt-700 text-sm font-semibold rounded-lg hover:bg-surface-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !email.trim() || !name.trim()}
                        className="flex-1 py-2.5 px-4 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Generating..." : "Generate Invite"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-txt-900">
                      Invite link ready!
                    </h2>
                    <p className="text-sm text-txt-500 mt-1">
                      Share this link with <span className="font-medium text-txt-700">{name}</span> to get them signed up.
                    </p>
                  </div>

                  {/* Link display */}
                  <div className="bg-surface-50 border border-surface-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-txt-700 break-all font-mono">
                      {inviteLink}
                    </p>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={handleCopy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    {/* WhatsApp share */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hey ${name}! I've set you up on Hercules Tracker to track your goals. Sign up here: ${inviteLink}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-whatsapp text-white text-sm font-semibold rounded-lg hover:bg-whatsapp-hover transition"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      </svg>
                      Share
                    </a>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full mt-3 py-2 text-sm font-medium text-txt-500 hover:text-txt-700 transition"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
