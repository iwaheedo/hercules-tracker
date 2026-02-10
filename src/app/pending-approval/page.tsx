import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  // If not a coach or already approved, redirect away
  if (!profile || profile.role !== "coach") redirect("/");
  if (profile.approved) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-txt-900 flex items-center justify-center">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-txt-900 tracking-tight">
            Hercules
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l2 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-txt-900">Pending Approval</h1>
          <p className="text-sm text-txt-500 mt-2 leading-relaxed">
            Your coach account is awaiting approval from an administrator. You
            will be able to access the dashboard once your account has been
            approved.
          </p>
          <div className="mt-6 pt-4 border-t border-surface-200">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
