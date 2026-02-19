"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  isValidUUID,
  isNonEmptyString,
  isOptionalString,
  isValidDate,
  isValidWeeklyStatus,
} from "@/lib/validation";
import {
  type DayKey,
  type DailyStatus,
  DAY_KEYS,
  cycleDay,
  computeStatusFromDaily,
} from "@/lib/daily-status";
import { verifyAccess } from "@/lib/auth-helpers";

function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  return monday.toISOString().split("T")[0];
}

export async function getWeeklyGoals(clientId: string, weekStart?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  if (!await verifyAccess(supabase, user.id, clientId)) {
    return { data: null, error: "Not authorized" };
  }

  const ws = weekStart || getCurrentWeekStart();

  // Find active quarterly goals whose quarter contains this week
  const { data: activeQuarters } = await supabase
    .from("quarterly_goals")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .lte("quarter_start", ws)
    .gte("quarter_end", ws);

  const activeQIds = (activeQuarters || []).map((q) => q.id);

  if (activeQIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("weekly_goals")
    .select(
      `
      *,
      quarterly_goal:quarterly_goals (
        id,
        title,
        goal:goals (
          id,
          title,
          category
        )
      )
    `
    )
    .eq("client_id", clientId)
    .in("quarterly_goal_id", activeQIds)
    .order("created_at");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getWeeklyGoalsAllClients(weekStart?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const ws = weekStart || getCurrentWeekStart();

  // Get all clients for this coach
  const { data: relationships } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", user.id)
    .eq("status", "active");

  if (!relationships || relationships.length === 0) {
    return { data: [], error: null };
  }

  const clientIds = relationships.map((r) => r.client_id);

  // Find active quarterly goals whose quarter contains this week
  const { data: activeQuarters } = await supabase
    .from("quarterly_goals")
    .select("id")
    .in("client_id", clientIds)
    .eq("status", "active")
    .lte("quarter_start", ws)
    .gte("quarter_end", ws);

  const activeQIds = (activeQuarters || []).map((q) => q.id);

  if (activeQIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("weekly_goals")
    .select(
      `
      *,
      client:profiles!weekly_goals_client_id_fkey (
        id,
        full_name
      ),
      quarterly_goal:quarterly_goals (
        id,
        title,
        goal:goals (
          id,
          title,
          category
        )
      )
    `
    )
    .in("client_id", clientIds)
    .in("quarterly_goal_id", activeQIds)
    .order("created_at");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createWeeklyGoal(formData: {
  quarterlyGoalId: string;
  clientId: string;
  title: string;
  weekStart: string;
  weekEnd: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Input validation
  if (!isValidUUID(formData.quarterlyGoalId)) return { error: "Invalid quarterly goal ID" };
  if (!isValidUUID(formData.clientId)) return { error: "Invalid client ID" };
  if (!isNonEmptyString(formData.title)) return { error: "Title is required (max 200 chars)" };
  if (!isValidDate(formData.weekStart)) return { error: "Invalid week start date" };
  if (!isValidDate(formData.weekEnd)) return { error: "Invalid week end date" };

  const { data, error } = await supabase
    .from("weekly_goals")
    .insert({
      quarterly_goal_id: formData.quarterlyGoalId,
      client_id: formData.clientId,
      title: formData.title,
      week_start: formData.weekStart,
      week_end: formData.weekEnd,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Audit log
  await supabase.from("goal_changes").insert({
    goal_id: data.id,
    goal_type: "weekly",
    user_id: user.id,
    action: "created",
    new_value: formData.title,
  });

  revalidatePath(`/clients/${formData.clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/portal");
  return { error: null, data };
}

export async function updateWeeklyGoal(
  goalId: string,
  updates: {
    title?: string;
    status?: string;
    coachNotes?: string;
    clientNotes?: string;
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
  if (updates.status !== undefined && !isValidWeeklyStatus(updates.status)) return { error: "Invalid status" };
  if (updates.coachNotes !== undefined && !isOptionalString(updates.coachNotes)) return { error: "Notes too long (max 2000 chars)" };
  if (updates.clientNotes !== undefined && !isOptionalString(updates.clientNotes)) return { error: "Notes too long (max 2000 chars)" };

  const { data: current } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (!current) return { error: "Weekly goal not found" };

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.coachNotes !== undefined) updateData.coach_notes = updates.coachNotes;
  if (updates.clientNotes !== undefined) updateData.client_notes = updates.clientNotes;

  const { error } = await supabase
    .from("weekly_goals")
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
        goal_type: "weekly" as const,
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
  revalidatePath("/dashboard");
  revalidatePath("/portal");
  return { error: null };
}

export async function updateWeeklyGoalStatus(
  goalId: string,
  status: string,
  clientNotes?: string
) {
  return updateWeeklyGoal(goalId, { status, clientNotes });
}

/**
 * Toggle a single day's status for a weekly goal.
 * Cycles: null → true → false → null
 * Auto-computes the overall status from daily_status.
 */
export async function toggleDayStatus(goalId: string, day: DayKey) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!isValidUUID(goalId)) return { error: "Invalid goal ID" };
  if (!DAY_KEYS.includes(day)) return { error: "Invalid day" };

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("*, daily_status")
    .eq("id", goalId)
    .single();

  if (!goal) return { error: "Weekly goal not found" };

  const dailyStatus: DailyStatus = (goal.daily_status as DailyStatus) || {};
  const currentVal = dailyStatus[day];
  const newVal = cycleDay(currentVal);

  const updatedDaily = { ...dailyStatus };
  if (newVal === null) {
    delete updatedDaily[day];
  } else {
    updatedDaily[day] = newVal;
  }

  const newStatus = computeStatusFromDaily(updatedDaily, goal.week_start);

  const { error } = await supabase
    .from("weekly_goals")
    .update({ daily_status: updatedDaily, status: newStatus })
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${goal.client_id}`);
  revalidatePath("/portal");
  return { error: null, dailyStatus: updatedDaily, status: newStatus };
}

export async function deleteWeeklyGoal(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("client_id")
    .eq("id", goalId)
    .single();

  if (!goal) return { error: "Weekly goal not found" };

  const { error } = await supabase
    .from("weekly_goals")
    .delete()
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${goal.client_id}`);
  revalidatePath("/dashboard");
  return { error: null };
}
