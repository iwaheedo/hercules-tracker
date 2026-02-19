"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  isValidUUID,
  isNonEmptyString,
  isOptionalString,
  isValidCategory,
  isValidDate,
  isValidGoalStatus,
  isValidProgress,
} from "@/lib/validation";
import { verifyAccess } from "@/lib/auth-helpers";

export async function getGoalsByClient(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (!await verifyAccess(supabase, user.id, clientId)) {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("client_id", clientId)
    .order("category")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createGoal(formData: {
  clientId: string;
  title: string;
  description?: string;
  category: string;
  targetDate?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Input validation
  if (!isValidUUID(formData.clientId)) return { error: "Invalid client ID" };
  if (!isNonEmptyString(formData.title)) return { error: "Title is required (max 200 chars)" };
  if (!isOptionalString(formData.description)) return { error: "Description too long (max 2000 chars)" };
  if (!isValidCategory(formData.category)) return { error: "Invalid category" };
  if (formData.targetDate && !isValidDate(formData.targetDate)) return { error: "Invalid target date" };

  // Determine coach_id: if the user IS the client, look up their linked coach
  let coachId = user.id; // default: user is the coach
  if (formData.clientId === user.id) {
    // Client is creating their own goal — find their coach
    const { data: rel } = await supabase
      .from("coach_clients")
      .select("coach_id")
      .eq("client_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    coachId = rel?.coach_id || user.id;
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      client_id: formData.clientId,
      coach_id: coachId,
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      target_date: formData.targetDate || null,
      status: "active",
      progress: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Audit log
  await supabase.from("goal_changes").insert({
    goal_id: data.id,
    goal_type: "three_year",
    user_id: user.id,
    action: "created",
    new_value: formData.title,
  });

  revalidatePath(`/clients/${formData.clientId}`);
  revalidatePath("/portal");
  return { error: null, data };
}

export async function updateGoal(
  goalId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string;
    status?: string;
    progress?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Input validation
  if (!isValidUUID(goalId)) return { error: "Invalid goal ID" };
  if (updates.title !== undefined && !isNonEmptyString(updates.title)) return { error: "Title is required (max 200 chars)" };
  if (updates.description !== undefined && !isOptionalString(updates.description)) return { error: "Description too long" };
  if (updates.category !== undefined && !isValidCategory(updates.category)) return { error: "Invalid category" };
  if (updates.targetDate !== undefined && updates.targetDate && !isValidDate(updates.targetDate)) return { error: "Invalid date" };
  if (updates.status !== undefined && !isValidGoalStatus(updates.status)) return { error: "Invalid status" };
  if (updates.progress !== undefined && !isValidProgress(updates.progress)) return { error: "Progress must be 0-100" };

  // Get current values for audit log
  const { data: current } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (!current) return { error: "Goal not found" };

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;

  const { error } = await supabase
    .from("goals")
    .update(updateData)
    .eq("id", goalId);

  if (error) return { error: error.message };

  // Audit log for each changed field
  const auditEntries = [];
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === "targetDate" ? "target_date" : key;
    const oldValue = current[dbKey as keyof typeof current];
    if (String(oldValue) !== String(value)) {
      auditEntries.push({
        goal_id: goalId,
        goal_type: "three_year" as const,
        user_id: user.id,
        action: key === "status" ? ("status_updated" as const) : ("edited" as const),
        field_changed: dbKey,
        old_value: String(oldValue ?? ""),
        new_value: String(value ?? ""),
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from("goal_changes").insert(auditEntries);
  }

  revalidatePath(`/clients/${current.client_id}`);
  revalidatePath("/portal");
  return { error: null };
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the goal first for revalidation
  const { data: goal } = await supabase
    .from("goals")
    .select("client_id, title")
    .eq("id", goalId)
    .single();

  if (!goal) return { error: "Goal not found" };

  const { error } = await supabase.from("goals").delete().eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${goal.client_id}`);
  revalidatePath("/portal");
  return { error: null };
}
