"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SUPER_COACH_EMAIL = "waheed@empasco.com";

async function verifySuperCoach() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase: null, error: "Not authenticated" };
  if (user.email !== SUPER_COACH_EMAIL)
    return { supabase: null, error: "Not authorized" };

  return { supabase, error: null };
}

export async function getPendingCoaches() {
  const { supabase, error } = await verifySuperCoach();
  if (error || !supabase) return { data: null, error: error || "Not authorized" };

  const { data: coaches, error: queryError } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "coach")
    .eq("approved", false)
    .order("created_at", { ascending: true });

  if (queryError) return { data: null, error: queryError.message };
  return { data: coaches, error: null };
}

export async function approveCoach(coachId: string) {
  const { supabase, error } = await verifySuperCoach();
  if (error || !supabase) return { error: error || "Not authorized" };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ approved: true })
    .eq("id", coachId)
    .eq("role", "coach");

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard");
  return { error: null };
}
