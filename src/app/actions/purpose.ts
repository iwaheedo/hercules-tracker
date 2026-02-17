"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePurpose(entries: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Validate: max 3 entries, each max 500 chars
  if (!Array.isArray(entries) || entries.length > 3) {
    return { error: "Maximum 3 entries allowed" };
  }

  for (const entry of entries) {
    if (typeof entry !== "string" || entry.length > 500) {
      return { error: "Each entry must be under 500 characters" };
    }
  }

  // Filter out empty entries before storing
  const cleaned = entries.map((e) => e.trim()).filter(Boolean);
  const value = cleaned.length > 0 ? JSON.stringify(cleaned) : null;

  const { error } = await supabase
    .from("profiles")
    .update({ purpose_text: value })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/portal");
  return { error: null };
}
