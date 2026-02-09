"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { removeClient } from "@/app/actions/clients";

interface ClientProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export function ClientHeader({ client }: { client: ClientProfile }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();

  const initials = client.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const memberSince = new Date(client.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const whatsappLink = client.phone
    ? `https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`
    : null;

  async function handleRemove() {
    setRemoving(true);
    const result = await removeClient(client.id);
    if (result.error) {
      alert(result.error);
      setRemoving(false);
      setShowConfirm(false);
      return;
    }
    router.push("/clients");
    router.refresh();
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-brand-600">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-bold text-txt-900">
                {client.full_name}
              </h1>
              <StatusBadge status="active" />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-txt-500">
              {client.phone && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {client.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Member since {memberSince}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-whatsapp text-white text-sm font-semibold rounded-lg hover:bg-whatsapp-hover transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.505 3.938 1.394 5.615L0 24l6.588-1.354C8.268 23.521 10.08 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.876 0-3.654-.5-5.19-1.38l-.372-.22-3.858.793.83-3.764-.244-.386C2.198 15.374 1.65 13.736 1.65 12 1.65 6.284 6.284 1.65 12 1.65S22.35 6.284 22.35 12 17.716 21.75 12 21.75z" />
                </svg>
                WhatsApp
              </a>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition"
              title="Remove client"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-txt-900">Remove client</h3>
                <p className="text-sm text-txt-500">This cannot be undone easily.</p>
              </div>
            </div>

            <p className="text-sm text-txt-600 mb-5">
              Are you sure you want to remove <span className="font-semibold text-txt-900">{client.full_name}</span> from your client list? Their goals and data will be preserved but you won&apos;t see them in your dashboard.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={removing}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-surface-300 text-txt-700 hover:bg-surface-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {removing ? "Removing..." : "Remove client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
