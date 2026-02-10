import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Homepage } from "@/components/homepage";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users see the homepage
  if (!user) {
    return <Homepage />;
  }

  // Try to fetch the profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  // If no profile exists (e.g., signed up before trigger was added),
  // create one from the user's metadata
  if (!profile) {
    const meta = user.user_metadata || {};
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: meta.full_name || user.email?.split("@")[0] || "User",
        role: meta.role || "client",
      })
      .select("role, approved")
      .single();

    if (newProfile) {
      profile = newProfile;
    }
  }

  // If still no profile (shouldn't happen, but safety net)
  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 rounded-lg bg-txt-900 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-4.5 h-4.5 text-white animate-pulse"
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
          <p className="text-sm text-txt-500">Setting up your account...</p>
          <meta httpEquiv="refresh" content="2" />
        </div>
      </div>
    );
  }

  // The coach-client link is auto-created by the database trigger (handle_new_user)
  // when invite_coach_id is present in user metadata. Clean up the metadata here
  // so it doesn't persist indefinitely.
  if (profile.role === "client") {
    const meta = user.user_metadata || {};
    if (meta.invite_coach_id) {
      await supabase.auth.updateUser({
        data: { invite_coach_id: null },
      });
    }
  }

  if (profile.role === "client") {
    redirect("/portal");
  } else if (profile.role === "coach" && !profile.approved) {
    redirect("/pending-approval");
  } else {
    redirect("/dashboard");
  }
}
