"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidUUID, isValidDate, isOptionalString, isValidCheckinStatus } from "@/lib/validation";

export async function getCheckins(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const now = new Date().toISOString();

  // Upcoming check-ins
  const { data: upcoming, error: upErr } = await supabase
    .from("checkins")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  // Past check-ins
  const { data: past, error: pastErr } = await supabase
    .from("checkins")
    .select("*")
    .eq("client_id", clientId)
    .or(`status.eq.completed,scheduled_at.lt.${now}`)
    .order("scheduled_at", { ascending: false })
    .limit(20);

  if (upErr || pastErr) {
    return { data: null, error: (upErr || pastErr)?.message };
  }

  return { data: { upcoming: upcoming || [], past: past || [] }, error: null };
}

export async function getNextCheckin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("checkins")
    .select(
      `
      *,
      client:profiles!checkins_client_id_fkey (
        id,
        full_name
      )
    `
    )
    .eq("coach_id", user.id)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createCheckin(formData: {
  clientId: string;
  scheduledAt: string;
  coachNotes?: string;
  isRecurring?: boolean;
  recurrenceWeeks?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const {
    clientId,
    scheduledAt,
    coachNotes,
    isRecurring = false,
    recurrenceWeeks: rawWeeks = 12,
  } = formData;

  // Input validation
  if (!clientId || typeof clientId !== "string") return { error: "Invalid client" };
  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) return { error: "Invalid date" };
  if (coachNotes && coachNotes.length > 2000) return { error: "Notes too long (max 2000 chars)" };

  // Cap recurrence to 52 weeks (1 year) to prevent abuse
  const recurrenceWeeks = Math.min(Math.max(1, Math.floor(rawWeeks)), 52);

  if (isRecurring) {
    // Generate a recurrence group ID
    const recurrenceGroup = crypto.randomUUID();
    const startDate = new Date(scheduledAt);

    // Create N rows, one per week
    const rows = [];
    for (let i = 0; i < recurrenceWeeks; i++) {
      const weekDate = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      rows.push({
        coach_id: user.id,
        client_id: clientId,
        scheduled_at: weekDate.toISOString(),
        status: "scheduled",
        coach_notes: i === 0 ? coachNotes || null : null,
        recurrence_group: recurrenceGroup,
      });
    }

    const { error } = await supabase.from("checkins").insert(rows);
    if (error) return { error: error.message };
  } else {
    // Single check-in (original behavior)
    const { error } = await supabase.from("checkins").insert({
      coach_id: user.id,
      client_id: clientId,
      scheduled_at: scheduledAt,
      status: "scheduled",
      coach_notes: coachNotes || null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateCheckin(
  checkinId: string,
  updates: {
    status?: string;
    coachNotes?: string;
    scheduledAt?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Input validation
  if (!isValidUUID(checkinId)) return { error: "Invalid check-in ID" };
  if (updates.status !== undefined && !isValidCheckinStatus(updates.status)) return { error: "Invalid status" };
  if (updates.coachNotes !== undefined && !isOptionalString(updates.coachNotes)) return { error: "Notes too long (max 2000 chars)" };
  if (updates.scheduledAt !== undefined && !isValidDate(updates.scheduledAt)) return { error: "Invalid date" };

  const updateData: Record<string, unknown> = {};
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.coachNotes !== undefined) updateData.coach_notes = updates.coachNotes;
  if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt;

  const { data: checkin } = await supabase
    .from("checkins")
    .select("client_id")
    .eq("id", checkinId)
    .single();

  const { error } = await supabase
    .from("checkins")
    .update(updateData)
    .eq("id", checkinId);

  if (error) return { error: error.message };

  if (checkin) {
    revalidatePath(`/clients/${checkin.client_id}`);
  }
  revalidatePath("/dashboard");
  return { error: null };
}

/**
 * Cancel all future scheduled check-ins in a recurring series.
 * Only the coach can do this.
 */
export async function cancelRecurrence(recurrenceGroupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const now = new Date().toISOString();

  // Verify the coach owns at least one check-in in this group
  const { data: sample } = await supabase
    .from("checkins")
    .select("coach_id, client_id")
    .eq("recurrence_group", recurrenceGroupId)
    .limit(1)
    .single();

  if (!sample || sample.coach_id !== user.id) {
    return { error: "Unauthorized" };
  }

  // Cancel all future scheduled check-ins in this group
  const { error } = await supabase
    .from("checkins")
    .update({ status: "cancelled" })
    .eq("recurrence_group", recurrenceGroupId)
    .eq("status", "scheduled")
    .gte("scheduled_at", now);

  if (error) return { error: error.message };

  revalidatePath(`/clients/${sample.client_id}`);
  revalidatePath("/dashboard");
  return { error: null };
}
