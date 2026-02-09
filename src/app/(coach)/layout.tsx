import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoachSidebar } from "./coach-sidebar";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile not ready yet — redirect to root which has a loading state
    redirect("/");
  }

  if (profile.role !== "coach") {
    // Wrong role — send to portal via root page
    redirect("/portal");
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <CoachSidebar coachName={profile.full_name} />
      <div className="lg:ml-60 min-h-screen">{children}</div>
    </div>
  );
}
