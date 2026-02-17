"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isOptionalString } from "@/lib/validation";

export async function updatePurpose(text: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!isOptionalString(text, 5000)) return { error: "Text too long (max 5000 chars)" };

  const { error } = await supabase
    .from("profiles")
    .update({ purpose_text: text || null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/portal");
  return { error: null };
}
