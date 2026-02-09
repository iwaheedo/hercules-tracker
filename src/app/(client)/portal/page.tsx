import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { MyGoalsTab } from "./my-goals-tab";
import { ThisWeekTab } from "./this-week-tab";
import { ClientCheckinsTab } from "./checkins-tab";

const TABS = [
  { id: "goals", label: "My Goals" },
  { id: "thisweek", label: "This Week" },
  { id: "checkins", label: "Check-ins" },
];

function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  return monday.toISOString().split("T")[0];
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; week?: string }>;
}) {
  const { tab = "goals", week } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  // Get coach info (for calendar invites)
  const { data: coachRelation } = await supabase
    .from("coach_clients")
    .select(
      `
      coach:profiles!coach_clients_coach_id_fkey (
        full_name,
        email
      )
    `
    )
    .eq("client_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const coachProfile = coachRelation?.coach as unknown as {
    full_name: string;
    email: string | null;
  } | null;

  // Determine which week to show
  const weekStart = week || getCurrentWeekStart();

  // Current date info for the header
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const fullDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Fetch data based on active tab
  let goals = null;
  let quarterlyGoals = null;
  let weeklyGoals = null;
  let checkins = null;

  if (tab === "goals" || tab === "thisweek") {
    // Get 3-year goals
    const { data: g } = await supabase
      .from("goals")
      .select("*")
      .eq("client_id", user.id)
      .order("category")
      .order("created_at", { ascending: false });
    goals = g;

    // Get quarterly goals with parent info
    const { data: qg } = await supabase
      .from("quarterly_goals")
      .select(
        `
        *,
        goal:goals (
          id,
          title,
          category
        )
      `
      )
      .eq("client_id", user.id)
      .order("quarter_start", { ascending: false });
    quarterlyGoals = qg;

    // Get weekly goals for the selected week
    const { data: wg } = await supabase
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
      .eq("client_id", user.id)
      .eq("week_start", weekStart)
      .order("created_at");
    weeklyGoals = wg;
  } else if (tab === "checkins") {
    const now = new Date().toISOString();

    const { data: upcoming } = await supabase
      .from("checkins")
      .select("*")
      .eq("client_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });

    const { data: past } = await supabase
      .from("checkins")
      .select("*")
      .eq("client_id", user.id)
      .neq("status", "scheduled")
      .order("scheduled_at", { ascending: false })
      .limit(20);

    checkins = { upcoming: upcoming || [], past: past || [] };
  }

  // Calculate overall stats
  const totalGoals = goals?.length || 0;
  const activeGoals = goals?.filter((g) => g.status === "active").length || 0;
  const thisWeekTotal = weeklyGoals?.length || 0;
  const thisWeekDone =
    weeklyGoals?.filter((g) => g.status === "completed").length || 0;

  return (
    <div>
      {/* Header with date */}
      <div className="mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-txt-900">
              Welcome, {profile?.full_name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-sm text-txt-500 mt-0.5">
              {dayOfWeek}, {fullDate}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-white border border-surface-200 rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold text-txt-900">{activeGoals}</p>
            <p className="text-[11px] text-txt-500 mt-0.5">Active Goals</p>
          </div>
          <div className="flex-1 bg-white border border-surface-200 rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold text-txt-900">
              {thisWeekTotal > 0
                ? Math.round((thisWeekDone / thisWeekTotal) * 100)
                : 0}
              %
            </p>
            <p className="text-[11px] text-txt-500 mt-0.5">This Week</p>
          </div>
          <div className="flex-1 bg-white border border-surface-200 rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold text-txt-900">
              {thisWeekDone}/{thisWeekTotal}
            </p>
            <p className="text-[11px] text-txt-500 mt-0.5">Completed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <TabNav tabs={TABS} activeTab={tab} />

        <div className="p-5">
          {tab === "goals" && (
            <MyGoalsTab
              goals={goals || []}
              quarterlyGoals={quarterlyGoals || []}
              weeklyGoals={weeklyGoals || []}
              userId={user.id}
            />
          )}
          {tab === "thisweek" && (
            <ThisWeekTab
              weeklyGoals={weeklyGoals || []}
              weekStart={weekStart}
            />
          )}
          {tab === "checkins" && (
            <ClientCheckinsTab
              checkins={checkins || { upcoming: [], past: [] }}
              clientName={profile?.full_name || "Client"}
              clientEmail={profile?.email || user.email || ""}
              coachName={coachProfile?.full_name || "Coach"}
              coachEmail={coachProfile?.email || ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
