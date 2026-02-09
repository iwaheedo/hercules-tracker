import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" });
  }

  // Get current user's profile
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get all profiles visible to this user
  const { data: allProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at");

  // Get all coach_clients rows visible
  const { data: allRelationships, error: relError } = await supabase
    .from("coach_clients")
    .select("id, coach_id, client_id, status, created_at");

  return NextResponse.json({
    currentUser: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
    myProfile,
    visibleProfiles: allProfiles,
    profilesError: profilesError?.message,
    coachClients: allRelationships,
    relError: relError?.message,
  });
}
