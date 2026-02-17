"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidUUID, isValidDate } from "@/lib/validation";

export async function setEngagementStart(clientId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!isValidUUID(clientId)) return { error: "Invalid client ID" };
  if (!isValidDate(date)) return { error: "Invalid date" };

  const { error } = await supabase
    .from("coach_clients")
    .update({ engagement_start: date })
    .eq("coach_id", user.id)
    .eq("client_id", clientId);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${clientId}`);
  return { error: null };
}
