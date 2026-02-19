import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify the caller has access to the given client's data.
 * Returns true if the user is the client themselves or an active coach.
 */
export async function verifyAccess(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<boolean> {
  // Self-access
  if (userId === clientId) return true;

  // Check for active coach-client relationship
  const { data } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", userId)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();

  return !!data;
}
