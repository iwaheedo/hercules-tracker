"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidUUID, isValidEmail, isNonEmptyString } from "@/lib/validation";

export async function getCoachClients() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Get all linked clients with their profiles
  const { data: relationships, error } = await supabase
    .from("coach_clients")
    .select(
      `
      id,
      status,
      created_at,
      client:profiles!coach_clients_client_id_fkey (
        id,
        full_name,
        email:id,
        phone,
        avatar_url,
        created_at
      )
    `
    )
    .eq("coach_id", user.id)
    .eq("status", "active");

  if (error) return { data: null, error: error.message };

  // For each client, get goal counts
  const clients = await Promise.all(
    (relationships || []).map(async (rel) => {
      const client = rel.client as unknown as {
        id: string;
        full_name: string;
        phone: string | null;
        avatar_url: string | null;
        created_at: string;
      };

      // Get active goals count
      const { count: goalsCount } = await supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "active");

      // Get this week's completion
      const today = new Date();
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      const weekStart = monday.toISOString().split("T")[0];

      const { data: weeklyGoals } = await supabase
        .from("weekly_goals")
        .select("status")
        .eq("client_id", client.id)
        .eq("week_start", weekStart);

      const total = weeklyGoals?.length || 0;
      const completed =
        weeklyGoals?.filter((g) => g.status === "completed").length || 0;
      const weeklyCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Get client email from auth (profiles don't store email)
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", client.id)
        .single();

      return {
        id: client.id,
        full_name: client.full_name,
        phone: client.phone,
        avatar_url: client.avatar_url,
        member_since: client.created_at,
        active_goals: goalsCount || 0,
        weekly_completion: weeklyCompletion,
        relationship_id: rel.id,
      };
    })
  );

  return { data: clients, error: null };
}

export async function getClientProfile(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Verify coach-client relationship exists
  const { data: relationship } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .single();

  if (!relationship) return { data: null, error: "Client not found" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error) return { data: null, error: error.message };

  return { data: profile, error: null };
}

export async function inviteClient(email: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", inviteLink: null, linked: false };

  // Input validation
  if (!isValidEmail(email)) return { error: "Invalid email address", inviteLink: null, linked: false };
  if (!isNonEmptyString(name)) return { error: "Name is required (max 200 chars)", inviteLink: null, linked: false };

  // Verify this user is a coach
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "coach") {
    return { error: "Only coaches can invite clients", inviteLink: null, linked: false };
  }

  // Check if a client with this email already exists in the system
  const { data: emailMatch } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "client")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  // Fall back to name match if no email match
  let matchingClient = emailMatch;
  if (!matchingClient) {
    const { data: allClients } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "client");

    matchingClient = allClients?.find(
      (c) => c.full_name?.toLowerCase() === name.toLowerCase()
    ) ?? null;
  }

  if (matchingClient) {
    // Check if already actively linked
    const { data: existingLink } = await supabase
      .from("coach_clients")
      .select("id, status")
      .eq("coach_id", user.id)
      .eq("client_id", matchingClient.id)
      .maybeSingle();

    if (existingLink && existingLink.status === "active") {
      return { error: "This client is already linked to your account.", inviteLink: null, linked: false };
    }

    if (existingLink && existingLink.status === "inactive") {
      // Re-activate the relationship
      await supabase
        .from("coach_clients")
        .update({ status: "active" })
        .eq("id", existingLink.id);
      revalidatePath("/clients");
      return { error: null, inviteLink: null, linked: true };
    }

    // Create new link
    await supabase.from("coach_clients").insert({
      coach_id: user.id,
      client_id: matchingClient.id,
    });
    revalidatePath("/clients");
    return { error: null, inviteLink: null, linked: true };
  }

  // Client doesn't exist yet — create a secure invite token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("invite_tokens")
    .insert({
      coach_id: user.id,
      email: email.toLowerCase(),
      name: name,
    })
    .select("token")
    .single();

  if (tokenError) return { error: "Failed to create invite", inviteLink: null, linked: false };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const inviteLink = `${baseUrl}/signup?token=${tokenRow.token}`;

  revalidatePath("/clients");
  return { error: null, inviteLink, linked: false };
}

export async function removeClient(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the coach-client relationship exists and belongs to this coach
  const { data: relationship } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!relationship) return { error: "Client relationship not found" };

  // Set status to inactive (soft delete — preserves data)
  const { error: updateError } = await supabase
    .from("coach_clients")
    .update({ status: "inactive" })
    .eq("id", relationship.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/clients");
  return { error: null };
}

export async function linkClientById(coachId: string, clientId: string) {
  const supabase = await createClient();

  // Verify caller is authenticated and is the coach being linked
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", alreadyLinked: false };
  if (user.id !== coachId) return { error: "Unauthorised", alreadyLinked: false };

  // Check if already linked
  const { data: existing } = await supabase
    .from("coach_clients")
    .select("id")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) return { error: null, alreadyLinked: true };

  // Create the relationship
  const { error: insertError } = await supabase.from("coach_clients").insert({
    coach_id: coachId,
    client_id: clientId,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/clients");
  return { error: null, alreadyLinked: false };
}
