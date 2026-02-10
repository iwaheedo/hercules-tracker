"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isNonEmptyString, isOptionalString } from "@/lib/validation";

export async function updateProfile(data: {
  fullName: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Input validation
  if (!isNonEmptyString(data.fullName)) return { error: "Name is required (max 200 chars)" };
  if (data.phone && !isOptionalString(data.phone, 30)) return { error: "Phone number too long" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  // Also update auth metadata so the JWT stays in sync
  await supabase.auth.updateUser({
    data: { full_name: data.fullName },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/portal");
  return { error: null };
}
