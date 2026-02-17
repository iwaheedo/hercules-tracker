import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { ClientHeader } from "./client-header";
import { GoalsTab } from "./goals-tab";
import { QuarterlyTab } from "./quarterly-tab";
import { WeeklyTab } from "./weekly-tab";
import { CheckinsTab } from "./checkins-tab";
import { ActivityTab } from "./activity-tab";
import { PurposeTab } from "./purpose-tab";

const TABS = [
  { id: "purpose", label: "Purpose & Why" },
  { id: "3year", label: "3-Year Goals" },
  { id: "quarterly", label: "Quarterly" },
  { id: "weekly", label: "Weekly" },
  { id: "checkins", label: "Check-ins" },
  { id: "activity", label: "Activity" },
];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string; week?: string }>;
}) {
  const { clientId } = await params;
  const { tab = "purpose", week } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify coach-client relationship
  const { data: relationship } = await supabase
    .from("coach_clients")
    .select("id, engagement_start")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .single();

  if (!relationship) redirect("/clients");

  const engagementStart: string | null = relationship.engagement_start;

  // Get client profile
  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) redirect("/clients");

  // Get coach profile (for check-in calendar invites)
  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  // Fetch data based on active tab
  let goals = null;
  let quarterlyGoals = null;
  let weeklyGoals = null;
  let checkins = null;
  let activityLog = null;

  if (tab === "3year") {
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("client_id", clientId)
      .order("category")
      .order("created_at", { ascending: false });
    goals = data;
  } else if (tab === "quarterly") {
    const { data } = await supabase
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
    quarterlyGoals = data;

    // Also get 3-year goals for the "add" dropdown
    const { data: parentGoals } = await supabase
      .from("goals")
      .select("id, title, category")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("category");
    goals = parentGoals;
  } else if (tab === "weekly") {
    // Calculate week start (used for display only, not filtering)
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
    const weekStart = week || monday.toISOString().split("T")[0];

    // Get active quarterly goals for this client (within current quarter)
    const { data: activeQuarters } = await supabase
      .from("quarterly_goals")
      .select("id, title, quarter_start, quarter_end, goal:goals(category)")
      .eq("client_id", clientId)
      .eq("status", "active");

    // Find quarterly goals whose quarter contains the selected week
    const activeQIds = (activeQuarters || [])
      .filter((q) => q.quarter_start <= weekStart && q.quarter_end >= weekStart)
      .map((q) => q.id);

    if (activeQIds.length > 0) {
      const { data } = await supabase
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
      weeklyGoals = data;
    } else {
      weeklyGoals = [];
    }

    // Also get quarterly goals for the "add" dropdown
    quarterlyGoals = activeQuarters;
  } else if (tab === "checkins") {
    const now = new Date().toISOString();
    const { data: upcoming } = await supabase
      .from("checkins")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });

    const { data: past } = await supabase
      .from("checkins")
      .select("*")
      .eq("client_id", clientId)
      .neq("status", "scheduled")
      .order("scheduled_at", { ascending: false })
      .limit(20);

    checkins = { upcoming: upcoming || [], past: past || [] };
  } else if (tab === "activity") {
    const { data } = await supabase
      .from("goal_changes")
      .select(
        `
        *,
        user:profiles!goal_changes_user_id_fkey (
          id,
          full_name,
          role
        )
      `
      )
      .or(
        `goal_id.in.(${
          // Get all goal IDs for this client across all levels
          ""
        })`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    // Better approach: get goal changes through goal IDs
    const { data: clientGoals } = await supabase
      .from("goals")
      .select("id")
      .eq("client_id", clientId);

    const { data: clientQuarterly } = await supabase
      .from("quarterly_goals")
      .select("id")
      .eq("client_id", clientId);

    const { data: clientWeekly } = await supabase
      .from("weekly_goals")
      .select("id")
      .eq("client_id", clientId);

    const allGoalIds = [
      ...(clientGoals?.map((g) => g.id) || []),
      ...(clientQuarterly?.map((g) => g.id) || []),
      ...(clientWeekly?.map((g) => g.id) || []),
    ];

    if (allGoalIds.length > 0) {
      const { data: changes } = await supabase
        .from("goal_changes")
        .select(
          `
          *,
          user:profiles!goal_changes_user_id_fkey (
            id,
            full_name,
            role
          )
        `
        )
        .in("goal_id", allGoalIds)
        .order("created_at", { ascending: false })
        .limit(50);
      activityLog = changes;
    } else {
      activityLog = [];
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <a
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-txt-500 hover:text-txt-900 mb-4 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </a>

        {/* Client Header */}
        <ClientHeader client={client} engagementStart={engagementStart} clientId={clientId} />

        {/* Tabs */}
        <div className="mt-6 bg-white rounded-xl border border-surface-200 overflow-hidden">
          <TabNav tabs={TABS} activeTab={tab} />

          <div className="p-5">
            {tab === "purpose" && (
              <PurposeTab purposeText={client.purpose_text || null} />
            )}
            {tab === "3year" && (
              <GoalsTab goals={goals || []} clientId={clientId} />
            )}
            {tab === "quarterly" && (
              <QuarterlyTab
                quarterlyGoals={quarterlyGoals || []}
                parentGoals={goals || []}
                clientId={clientId}
                engagementStart={engagementStart}
              />
            )}
            {tab === "weekly" && (
              <WeeklyTab
                weeklyGoals={weeklyGoals || []}
                quarterlyGoals={quarterlyGoals || []}
                clientId={clientId}
                engagementStart={engagementStart}
                weekStart={
                  week ||
                  (() => {
                    const today = new Date();
                    const day = today.getDay();
                    const monday = new Date(today);
                    monday.setDate(
                      today.getDate() - day + (day === 0 ? -6 : 1)
                    );
                    return monday.toISOString().split("T")[0];
                  })()
                }
              />
            )}
            {tab === "checkins" && (
              <CheckinsTab
                checkins={checkins || { upcoming: [], past: [] }}
                clientId={clientId}
                clientName={client.full_name}
                clientEmail={client.email || ""}
                coachName={coachProfile?.full_name || "Coach"}
                coachEmail={coachProfile?.email || ""}
              />
            )}
            {tab === "activity" && (
              <ActivityTab changes={activityLog || []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
