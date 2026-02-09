import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { SignOutButton } from "@/components/sign-out-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  const isCoach = profile.role === "coach";

  // For clients, get their coach info
  let coach: { full_name: string; phone: string | null } | null = null;
  if (!isCoach) {
    const { data: coachRelation } = await supabase
      .from("coach_clients")
      .select(
        `
        coach:profiles!coach_clients_coach_id_fkey (
          full_name,
          phone
        )
      `
      )
      .eq("client_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    coach = coachRelation?.coach as unknown as {
      full_name: string;
      phone: string | null;
    } | null;
  }

  // For coaches, get client count
  let clientCount = 0;
  if (isCoach) {
    const { count } = await supabase
      .from("coach_clients")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .eq("status", "active");
    clientCount = count || 0;
  }

  return (
    <div className={isCoach ? "p-6 lg:p-8" : ""}>
      <div className={isCoach ? "max-w-2xl mx-auto" : ""}>
        <div className={isCoach ? "mb-6" : "mb-5"}>
          <h1
            className={
              isCoach
                ? "text-2xl font-bold text-txt-900"
                : "text-xl sm:text-2xl font-bold text-txt-900"
            }
          >
            Settings
          </h1>
          <p className="text-sm text-txt-500 mt-0.5">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
          <h2 className="text-base font-semibold text-txt-900 mb-4">
            Profile
          </h2>
          <SettingsForm
            fullName={profile.full_name}
            email={user.email || ""}
            phone={profile.phone || ""}
          />
        </div>

        {/* Coach Info (client only) */}
        {!isCoach && coach && (
          <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
            <h2 className="text-base font-semibold text-txt-900 mb-4">
              Your Coach
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-600">
                  {coach.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-txt-900">
                  {coach.full_name}
                </p>
                {coach.phone && (
                  <p className="text-xs text-txt-500">{coach.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
          <h2 className="text-base font-semibold text-txt-900 mb-4">
            Account
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-medium text-txt-500 uppercase tracking-wide">
                Role
              </p>
              <p className="text-sm text-txt-900 mt-0.5 capitalize">
                {profile.role}
              </p>
            </div>
            {isCoach && (
              <div>
                <p className="text-[11px] font-medium text-txt-500 uppercase tracking-wide">
                  Active Clients
                </p>
                <p className="text-sm text-txt-900 mt-0.5">
                  {clientCount}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-medium text-txt-500 uppercase tracking-wide">
                Member Since
              </p>
              <p className="text-sm text-txt-900 mt-0.5">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-txt-500 uppercase tracking-wide">
                Email
              </p>
              <p className="text-sm text-txt-900 mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h2 className="text-base font-semibold text-red-700 mb-2">
            Sign Out
          </h2>
          <p className="text-sm text-txt-500 mb-3">
            Sign out of your account on this device.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
