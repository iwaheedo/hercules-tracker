import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  const isCoach = profile.role === "coach";
  const backHref = isCoach ? "/dashboard" : "/portal";
  const backLabel = isCoach ? "Dashboard" : "Portal";

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-surface-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm text-txt-500 hover:text-txt-900 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to {backLabel}
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-600">
                  {profile.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-txt-700 hidden sm:block">
                {profile.full_name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
