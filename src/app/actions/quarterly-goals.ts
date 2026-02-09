"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getQuarterlyGoals(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("quarterly_goals")
    .select(
      `
      *,
      goal:goals (
        id,
        title,
        category,
        status
      )
    `
    )
    .eq("client_id", clientId)
    .order("quarter_start", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getQuarterlyGoalsByGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("quarterly_goals")
    .select("*")
    .eq("goal_id", goalId)
    .order("quarter_start", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createQuarterlyGoal(formData: {
  goalId: string;
  clientId: string;
  title: string;
  description?: string;
  quarterStart: string;
  quarterEnd: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("quarterly_goals")
    .insert({
      goal_id: formData.goalId,
      client_id: formData.clientId,
      title: formData.title,
      description: formData.description || null,
      quarter_start: formData.quarterStart,
      quarter_end: formData.quarterEnd,
      status: "active",
      progress: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Audit log
  await supabase.from("goal_changes").insert({
    goal_id: data.id,
    goal_type: "quarterly",
    user_id: user.id,
    action: "created",
    new_value: formData.title,
  });

  revalidatePath(`/clients/${formData.clientId}`);
  revalidatePath("/portal");
  return { error: null, data };
}

export async function updateQuarterlyGoal(
  goalId: string,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    progress?: number;
    coachNotes?: string;
    clientNotes?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: current } = await supabase
    .from("quarterly_goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (!current) return { error: "Quarterly goal not found" };

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;
  if (updates.coachNotes !== undefined) updateData.coach_notes = updates.coachNotes;
  if (updates.clientNotes !== undefined) updateData.client_notes = updates.clientNotes;

  const { error } = await supabase
    .from("quarterly_goals")
    .update(updateData)
    .eq("id", goalId);

  if (error) return { error: error.message };

  // Audit log
  const auditEntries = [];
  for (const [key, value] of Object.entries(updates)) {
    const dbKey =
      key === "coachNotes"
        ? "coach_notes"
        : key === "clientNotes"
        ? "client_notes"
        : key;
    const oldValue = current[dbKey as keyof typeof current];
    if (String(oldValue ?? "") !== String(value ?? "")) {
      auditEntries.push({
        goal_id: goalId,
        goal_type: "quarterly" as const,
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

export async function deleteQuarterlyGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: goal } = await supabase
    .from("quarterly_goals")
    .select("client_id")
    .eq("id", goalId)
    .single();

  if (!goal) return { error: "Quarterly goal not found" };

  const { error } = await supabase
    .from("quarterly_goals")
    .delete()
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${goal.client_id}`);
  revalidatePath("/portal");
  return { error: null };
}
